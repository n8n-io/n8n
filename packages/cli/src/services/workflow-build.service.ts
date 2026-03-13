import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { WorkflowEntity } from '@n8n/db';
import { ProjectRepository, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	generateWorkflowCode,
	parseWorkflowCodeToBuilder,
	setSchemaBaseDirs,
	validateWorkflow,
} from '@n8n/workflow-sdk';
import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import { resolveBuiltinNodeDefinitionDirs } from '@/modules/instance-ai/node-definition-resolver';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowService } from '@/workflows/workflow.service';

/** Validation warning with optional location info */
export interface ValidationWarning {
	code: string;
	message: string;
	nodeName?: string;
	parameterPath?: string;
}

export interface ParseAndValidateResult {
	workflow: WorkflowJSON;
	warnings: ValidationWarning[];
}

/** Matches any import statement */
const IMPORT_REGEX = /^\s*import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"];?\s*$/gm;

/** Matches local import statements (relative paths) */
const LOCAL_IMPORT_REGEX = /^\s*import\s+(?:[\s\S]*?from\s+)?['"](\.\.?\/[^'"]+)['"];?\s*$/gm;

/** Known informational-only codes (not blockers) */
const INFORMATIONAL_CODES = new Set(['MISSING_TRIGGER', 'DISCONNECTED_NODE']);

/** Node types that require webhookId */
const WEBHOOK_NODE_TYPES = new Set([
	WEBHOOK_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
]);

@Service()
export class WorkflowBuildService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowService: WorkflowService,
		private readonly ownershipService: OwnershipService,
	) {}

	/**
	 * Initialize schema validation with built-in node definition directories.
	 */
	initSchemaValidation(): void {
		const dirs = resolveBuiltinNodeDefinitionDirs();
		if (dirs.length > 0) {
			setSchemaBaseDirs(dirs);
		}
	}

	/**
	 * Read a .ts file from disk, resolve local imports, strip SDK imports,
	 * and parse + validate the resulting workflow code.
	 */
	async parseAndValidateFile(filePath: string): Promise<ParseAndValidateResult> {
		const absolutePath = path.resolve(filePath);
		const code = fs.readFileSync(absolutePath, 'utf-8');
		const basePath = path.dirname(absolutePath);

		// Resolve local imports (inline chunk files)
		const resolvedCode = await this.resolveLocalImports(code, basePath);

		// Strip all import statements — SDK functions are available as globals in the AST interpreter
		const strippedCode = this.stripImportStatements(resolvedCode);

		return this.parseAndValidate(strippedCode);
	}

	/**
	 * Create a new workflow from WorkflowJSON.
	 * Uses two-step create pattern: empty shell first, then update with nodes,
	 * to ensure WorkflowHistory entry is created for activation support.
	 */
	async createWorkflow(json: WorkflowJSON, projectId?: string): Promise<WorkflowEntity> {
		const user = await this.ownershipService.getInstanceOwner();

		// Step 1: Create empty shell
		const newWorkflow = this.workflowRepository.create({
			name: json.name,
			nodes: [] as INode[],
			connections: {} as IConnections,
			settings: (json.settings ?? {}) as IWorkflowSettings,
			active: false,
			versionId: randomUUID(),
		} as Partial<WorkflowEntity>);

		const saved = await this.workflowRepository.save(newWorkflow);

		// Assign to project
		const ownerProjectId =
			projectId ?? (await this.projectRepository.getPersonalProjectForUserOrFail(user.id)).id;
		await this.sharedWorkflowRepository.save(
			this.sharedWorkflowRepository.create({
				role: 'workflow:owner',
				projectId: ownerProjectId,
				workflow: saved,
			}),
		);

		// Step 2: Update with actual nodes — creates WorkflowHistory entry
		const updateData = this.workflowRepository.create({
			name: json.name,
			nodes: json.nodes as unknown as INode[],
			connections: json.connections as unknown as IConnections,
			settings: (json.settings ?? {}) as IWorkflowSettings,
		} as Partial<WorkflowEntity>);

		return await this.workflowService.update(user, updateData, saved.id);
	}

	/**
	 * Update an existing workflow from WorkflowJSON.
	 */
	async updateWorkflow(workflowId: string, json: WorkflowJSON): Promise<WorkflowEntity> {
		const user = await this.ownershipService.getInstanceOwner();

		const updateData = this.workflowRepository.create({
			name: json.name,
			nodes: json.nodes as unknown as INode[],
			connections: json.connections as unknown as IConnections,
			settings: (json.settings ?? {}) as IWorkflowSettings,
		} as Partial<WorkflowEntity>);

		return await this.workflowService.update(user, updateData, workflowId);
	}

	/**
	 * Export an existing workflow as TypeScript SDK code.
	 */
	async exportToCode(workflowId: string): Promise<string> {
		const workflow = await this.workflowRepository.findOneBy({ id: workflowId });
		if (!workflow) {
			throw new Error(`Workflow "${workflowId}" not found`);
		}

		const json = this.toWorkflowJSON(workflow);
		return generateWorkflowCode(json);
	}

	/**
	 * Generate webhookIds for webhook/form/chat trigger nodes.
	 * Preserves existing IDs on update; generates new UUIDs for new nodes.
	 */
	async ensureWebhookIds(json: WorkflowJSON, existingWorkflowId?: string): Promise<WorkflowJSON> {
		const existingWebhookIds = new Map<string, string>();

		if (existingWorkflowId) {
			const existing = await this.workflowRepository.findOneBy({ id: existingWorkflowId });
			if (existing?.nodes) {
				for (const node of existing.nodes) {
					if (node.webhookId) {
						existingWebhookIds.set(node.name, node.webhookId);
					}
				}
			}
		}

		const updatedNodes = json.nodes.map((node) => {
			if (!WEBHOOK_NODE_TYPES.has(node.type)) return node;

			const existingId = node.name ? existingWebhookIds.get(node.name) : undefined;
			return {
				...node,
				webhookId: existingId ?? randomUUID(),
			};
		});

		return { ...json, nodes: updatedNodes };
	}

	/**
	 * Partition warnings into blocking errors and informational warnings.
	 */
	partitionWarnings(warnings: ValidationWarning[]): {
		errors: ValidationWarning[];
		informational: ValidationWarning[];
	} {
		const errors: ValidationWarning[] = [];
		const informational: ValidationWarning[] = [];

		for (const w of warnings) {
			if (INFORMATIONAL_CODES.has(w.code)) {
				informational.push(w);
			} else {
				errors.push(w);
			}
		}

		return { errors, informational };
	}

	private parseAndValidate(code: string): ParseAndValidateResult {
		try {
			const builder = parseWorkflowCodeToBuilder(code);
			builder.regenerateNodeIds();

			const allWarnings: ValidationWarning[] = [];

			// Stage 1: Structural validation via graph validators
			const graphValidation = builder.validate();
			for (const issue of [...graphValidation.errors, ...graphValidation.warnings]) {
				allWarnings.push({
					code: issue.code,
					message: issue.message,
					nodeName: issue.nodeName,
				});
			}

			// Convert to JSON (auto-layout calculates positions)
			const json = builder.toJSON();

			// Stage 2: Schema validation via Zod schemas
			const schemaValidation = validateWorkflow(json);
			for (const issue of [...schemaValidation.errors, ...schemaValidation.warnings]) {
				allWarnings.push({
					code: issue.code,
					message: issue.message,
					nodeName: issue.nodeName,
				});
			}

			return { workflow: json, warnings: allWarnings };
		} catch (error) {
			throw new Error(
				`Failed to parse workflow code: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private stripImportStatements(code: string): string {
		return code
			.replace(IMPORT_REGEX, '')
			.replace(/^\s*\n/, '')
			.trim();
	}

	/**
	 * Resolve local imports by reading files from the local filesystem and inlining them.
	 */
	private async resolveLocalImports(code: string, basePath: string): Promise<string> {
		const resolved = new Set<string>();
		const inlinedChunks: string[] = [];

		const resolveFile = async (fileCode: string, fileDir: string, depth: number) => {
			if (depth > 5) return; // Guard against circular imports

			const imports: Array<{ fullMatch: string; specifier: string }> = [];
			let match: RegExpExecArray | null;
			const regex = new RegExp(LOCAL_IMPORT_REGEX.source, 'gm');

			while ((match = regex.exec(fileCode)) !== null) {
				imports.push({ fullMatch: match[0], specifier: match[1] });
			}

			for (const imp of imports) {
				let resolvedPath = path.resolve(fileDir, imp.specifier);
				if (!resolvedPath.endsWith('.ts')) {
					resolvedPath += '.ts';
				}

				if (resolved.has(resolvedPath)) continue;
				resolved.add(resolvedPath);

				let content: string;
				try {
					content = fs.readFileSync(resolvedPath, 'utf-8');
				} catch {
					continue; // Skip missing files
				}

				await resolveFile(content, path.dirname(resolvedPath), depth + 1);

				// Strip SDK imports and export keywords
				const sdkImportRegex =
					/^\s*import\s+(?:[\s\S]*?from\s+)?['"]@n8n\/workflow-sdk['"];?\s*$/gm;
				let cleaned = content.replace(sdkImportRegex, '').trim();
				cleaned = cleaned.replace(new RegExp(LOCAL_IMPORT_REGEX.source, 'gm'), '');
				cleaned = cleaned.replace(/^export\s+default\s+/gm, '');
				cleaned = cleaned.replace(/^export\s+/gm, '');
				cleaned = cleaned.trim();

				if (cleaned) {
					inlinedChunks.push(cleaned);
				}
			}
		};

		await resolveFile(code, basePath, 0);

		const mainCode = code.replace(new RegExp(LOCAL_IMPORT_REGEX.source, 'gm'), '');

		if (inlinedChunks.length === 0) {
			return mainCode;
		}

		return [...inlinedChunks, mainCode].join('\n\n');
	}

	private toWorkflowJSON(workflow: WorkflowEntity): WorkflowJSON {
		return {
			id: workflow.id,
			name: workflow.name,
			nodes: (workflow.nodes ?? []).map((n) => ({
				id: n.id ?? '',
				name: n.name,
				type: n.type,
				typeVersion: n.typeVersion,
				position: n.position,
				parameters: n.parameters,
				credentials: n.credentials as Record<string, { id?: string; name: string }> | undefined,
				webhookId: n.webhookId,
				disabled: n.disabled,
				notes: n.notes,
			})),
			connections: workflow.connections as WorkflowJSON['connections'],
			settings: workflow.settings as WorkflowJSON['settings'],
		};
	}
}
