import type { WorkflowMigrationResult } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeTypes } from '@/node-types';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { MigrationRegistry } from './breaking-changes.migration-registry.service';
import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { groupNodesByType } from './group-nodes-by-type';
import type {
	NodeMigration,
	WorkflowMigration,
	WorkflowMigrationOutput,
} from './migrations/node-migration';
import { isWorkflowMigration, WorkflowMigrationNodeError } from './migrations/node-migration';

export { WorkflowMigrationNodeError };

@Service()
export class BreakingChangeMigrationService {
	constructor(
		private readonly ruleRegistry: RuleRegistry,
		private readonly migrationRegistry: MigrationRegistry,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
		private readonly workflowValidationService: WorkflowValidationService,
		private readonly nodeTypes: NodeTypes,
		private readonly logger: Logger,
	) {
		this.logger = logger.scoped('breaking-changes');
	}

	/**
	 * Rewrites a single workflow so the nodes a rule flags as deprecated stop
	 * depending on the removed behavior, then saves the result as a new workflow version.
	 */
	async migrateWorkflow(
		ruleId: string,
		workflowId: string,
		user: User,
	): Promise<WorkflowMigrationResult> {
		const migration = this.migrationRegistry.get(ruleId);
		if (!migration) {
			throw new BadRequestError(`No automated migration is available for rule '${ruleId}'.`);
		}

		const rule = this.ruleRegistry.getRule(ruleId);
		if (!rule || !('detectWorkflow' in rule)) {
			throw new BadRequestError(`Rule '${ruleId}' does not support automated migration.`);
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:update',
		]);
		if (!workflow) {
			throw new NotFoundError(
				'You do not have permission to update this workflow. Ask the owner to share it with you.',
			);
		}

		// Whether the version we're about to migrate is the one currently published.
		// Only then may we offer a one-click re-publish: a draft ahead of the
		// published version must not be published without the user reviewing it.
		const wasPublishedVersion =
			!!workflow.activeVersionId && workflow.activeVersionId === workflow.versionId;

		// Detection decides which nodes to migrate, so the transform stays aligned with the report.
		const detection = await rule.detectWorkflow(workflow, groupNodesByType(workflow.nodes));
		const affectedNodeIds = new Set(
			detection.issues.map((issue) => issue.nodeId).filter((id): id is string => Boolean(id)),
		);
		if (affectedNodeIds.size === 0) {
			throw new BadRequestError('This workflow has no nodes affected by the selected rule.');
		}

		const applied = isWorkflowMigration(migration)
			? this.applyWorkflowMigration(migration, workflow, affectedNodeIds)
			: this.applyNodeMigration(migration, workflow, affectedNodeIds);
		const { nodes, connections, migratedNodeIds } = applied;
		const unmapped = applied.unmapped ?? [];
		const notes = applied.notes ?? [];

		// Best-effort hint for a one-click re-publish: clean migration of the published
		// version that still validates for activation. It's a subset of the full activation
		// gate, so publishing can still fail (handled gracefully in the UI).
		const republishable =
			unmapped.length === 0 &&
			notes.length === 0 &&
			wasPublishedVersion &&
			this.workflowValidationService.validateForActivation(
				Object.fromEntries(nodes.map((node) => [node.name, node])),
				connections,
				this.nodeTypes,
			).isValid;

		// Checksum of the workflow as fetched, so a concurrent edit landing between
		// this read and the write below is rejected as a conflict rather than clobbered.
		const expectedChecksum = await calculateWorkflowChecksum(workflow);

		workflow.nodes = nodes;
		workflow.connections = connections;
		const updated = await this.workflowService.update(user, workflow, workflowId, {
			versionName: 'Automated node migration',
			expectedChecksum,
		});

		this.logger.info('Applied automated node migration', {
			ruleId,
			workflowId,
			migratedNodeIds,
		});

		return {
			workflowId,
			newVersionId: updated.versionId,
			migratedNodeIds,
			unmapped,
			notes,
			republishable,
		};
	}

	/** Swaps each affected node for its replacement in place; connections are passed through untouched. */
	private applyNodeMigration(
		migration: NodeMigration,
		workflow: WorkflowEntity,
		affectedNodeIds: Set<string>,
	): WorkflowMigrationOutput {
		const unmapped: string[] = [];
		const notes: string[] = [];
		const migratedNodeIds: string[] = [];

		const migratedNodes = workflow.nodes.map((node) => {
			if (!affectedNodeIds.has(node.id)) return node;

			// A node the migration refuses aborts the whole workflow before any save.
			let result;
			try {
				result = migration.migrate(node);
			} catch (error) {
				throw new WorkflowMigrationNodeError(
					error instanceof Error ? error.message : 'Migration failed.',
					{ nodeId: node.id, nodeName: node.name },
				);
			}
			migratedNodeIds.push(node.id);
			if (result.unmapped?.length) unmapped.push(...result.unmapped);
			if (result.notes?.length) notes.push(...result.notes);

			// Keep id/name/position so connections (keyed by node name) stay intact.
			return {
				...node,
				type: result.node.type,
				typeVersion: result.node.typeVersion,
				parameters: result.node.parameters,
			} satisfies INode;
		});

		return {
			nodes: migratedNodes,
			connections: workflow.connections,
			migratedNodeIds,
			unmapped,
			notes,
		};
	}

	/** Hands the whole graph to the migration so it can add nodes and rewire edges. */
	private applyWorkflowMigration(
		migration: WorkflowMigration,
		workflow: WorkflowEntity,
		affectedNodeIds: Set<string>,
	): WorkflowMigrationOutput {
		try {
			return migration.migrateWorkflow({
				nodes: workflow.nodes,
				connections: workflow.connections,
				affectedNodeIds,
			});
		} catch (error) {
			if (error instanceof WorkflowMigrationNodeError) throw error;
			throw new BadRequestError(error instanceof Error ? error.message : 'Migration failed.');
		}
	}
}
