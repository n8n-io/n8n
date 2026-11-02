import type {
	InstanceAiEvalFailedExecutionEnvelope,
	InstanceAiEvalFailedExecutionSummary,
} from '@n8n/api-types';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { Logger, parseFlatted } from '@n8n/backend-common';
import { SharedWorkflowRepository, type IExecutionBase, type User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { Service } from '@n8n/di';
import { stringify } from 'flatted';
import {
	generateSecureToken,
	UnexpectedError,
	migrateRunExecutionData,
	type IConnections,
	type INode,
	type IRunExecutionData,
	type IRunExecutionDataAll,
	type ITaskMetadata,
	type IWorkflowBase,
	type IWorkflowGroup,
} from 'n8n-workflow';
import { isDeepStrictEqual } from 'node:util';

import { ActiveExecutions } from '@/active-executions';
import { isExecutionIdV2 } from '@/executions/execution-id';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { loadExecutionForViewer } from '@/executions/execution-viewer-reader';
import { hasExternalBinaryData } from '@/executions/sum-binary-data-bytes';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { formatExecutionError } from '../instance-ai.adapter.service';

type HistoricalWorkflowSnapshot = Pick<
	IWorkflowBase,
	'id' | 'name' | 'nodes' | 'connections' | 'settings' | 'nodeGroups'
>;

export interface FailedExecutionExportResult {
	envelope: InstanceAiEvalFailedExecutionEnvelope;
	summary: InstanceAiEvalFailedExecutionSummary;
}

export interface FailedExecutionRestoreResult {
	ok: true;
	workflowId: string;
	executionId: string;
	timestampOffsetMs: number;
	summary: InstanceAiEvalFailedExecutionSummary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMigratableRunData(value: unknown): value is IRunExecutionDataAll {
	if (!isRecord(value)) return false;
	if (value.version !== undefined && value.version !== 0 && value.version !== 1) return false;
	if (!isRecord(value.resultData) || !isRecord(value.resultData.runData)) return false;
	return Object.values(value.resultData.runData).every((runs) => Array.isArray(runs));
}

function isWorkflowNode(value: unknown): value is INode {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		typeof value.type === 'string' &&
		typeof value.typeVersion === 'number' &&
		Array.isArray(value.position) &&
		value.position.length === 2 &&
		value.position.every((coordinate) => typeof coordinate === 'number') &&
		isRecord(value.parameters)
	);
}

function isConnections(value: unknown): value is IConnections {
	return isRecord(value);
}

function isWorkflowSettings(value: unknown): value is IWorkflowBase['settings'] {
	return value === undefined || isRecord(value);
}

function isWorkflowGroup(value: unknown): value is IWorkflowGroup {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		Array.isArray(value.nodeIds) &&
		value.nodeIds.every((nodeId) => typeof nodeId === 'string') &&
		(value.description === undefined || typeof value.description === 'string')
	);
}

function hasRelatedExecution(metadata: ITaskMetadata | undefined): boolean {
	return metadata?.parentExecution !== undefined || metadata?.subExecution !== undefined;
}

function dependencyError(path: string): BadRequestError {
	return new BadRequestError(`Execution cannot be exported because ${path} is not portable`);
}

function assertFiniteTimestamp(value: number, path: string): void {
	if (!Number.isFinite(value)) throw new BadRequestError(`${path} must be a finite timestamp`);
}

@Service()
export class FailedExecutionPortabilityService {
	constructor(
		private readonly executionPersistence: ExecutionPersistence,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly logger: Logger,
	) {}

	async exportExecution(
		user: User,
		projectId: string,
		executionId: string,
	): Promise<FailedExecutionExportResult> {
		// Engine v2 executions live in the data plane, not the execution table this reads.
		if (isExecutionIdV2(executionId)) {
			throw new BadRequestError('Engine v2 executions are not portable');
		}
		const execution = await this.executionPersistence.findSingleExecution(executionId, {
			includeData: false,
		});
		if (!execution) throw new NotFoundError('Execution not found');

		// Reading run data needs `execution:read` too, as in the executions API.
		await this.assertWorkflowAccess(user, execution.workflowId, projectId, [
			'workflow:read',
			'execution:read',
		]);
		this.assertPortableExecution(execution, executionId);

		// Read the content as the user may see it. A run redacted for them is then
		// refused by `assertPortableData`, so an export never reveals hidden data.
		const viewed = await loadExecutionForViewer(executionId, user);
		if (!viewed?.data) throw new NotFoundError('Execution not found');
		const data = await this.parsePortableData(stringify(viewed.data), executionId);
		this.assertPortableData(data);
		this.removeSourceOperationalMetadata(data);

		const workflowData = this.toHistoricalSnapshot(viewed.workflowData);
		if (workflowData.id !== execution.workflowId) {
			throw new BadRequestError('Execution workflow snapshot does not match its owning workflow');
		}

		const envelope: InstanceAiEvalFailedExecutionEnvelope = {
			format: 'n8n-instance-ai-failed-execution',
			version: 1,
			source: {
				executionId: execution.id,
				workflowId: execution.workflowId,
				workflowVersionId: execution.workflowVersionId ?? null,
				createdAt: execution.createdAt.toISOString(),
				startedAt: execution.startedAt.toISOString(),
				stoppedAt: execution.stoppedAt.toISOString(),
			},
			execution: {
				mode: execution.mode,
				status: execution.status,
				finished: false,
				workflowData,
				data: stringify(data),
			},
		};

		return { envelope, summary: this.summarize(data, execution.status) };
	}

	async restoreExecution(
		user: User,
		projectId: string,
		workflowId: string,
		envelope: InstanceAiEvalFailedExecutionEnvelope,
	): Promise<FailedExecutionRestoreResult> {
		await this.assertWorkflowAccess(user, workflowId, projectId, ['workflow:execute']);
		this.assertEnvelopeConsistency(envelope);
		// Export never produces one, but the envelope schema accepts every mode.
		if (envelope.execution.mode === 'retry') {
			throw new BadRequestError('A retry execution cannot be restored');
		}

		const data = await this.parsePortableData(envelope.execution.data, envelope.source.executionId);
		this.assertPortableData(data);
		if (data.resumeToken !== undefined) {
			throw new BadRequestError('Portable execution data must not contain a source resume token');
		}
		this.removeSourceOperationalMetadata(data);

		const sourceStartedAt = this.parseDate(envelope.source.startedAt, 'source.startedAt');
		const sourceStoppedAt = this.parseDate(envelope.source.stoppedAt, 'source.stoppedAt');
		if (sourceStoppedAt.getTime() < sourceStartedAt.getTime()) {
			throw new BadRequestError('source.stoppedAt must not be earlier than source.startedAt');
		}

		const importedStoppedAt = new Date();
		const timestampOffsetMs = importedStoppedAt.getTime() - sourceStoppedAt.getTime();
		const importedStartedAt = new Date(sourceStartedAt.getTime() + timestampOffsetMs);
		this.shiftDiagnosticTimestamps(data, timestampOffsetMs);
		data.resumeToken = generateSecureToken();

		const snapshot = this.toHistoricalSnapshot(envelope.execution.workflowData);
		const workflowData: IWorkflowBase = {
			id: workflowId,
			name: snapshot.name,
			active: false,
			isArchived: false,
			createdAt: importedStoppedAt,
			updatedAt: importedStoppedAt,
			nodes: snapshot.nodes,
			connections: snapshot.connections,
			settings: snapshot.settings,
			activeVersionId: null,
			versionId: envelope.source.workflowVersionId ?? undefined,
			nodeGroups: snapshot.nodeGroups,
		};

		let executionId: string | undefined;
		try {
			executionId = await this.executionPersistence.create({
				data,
				workflowData,
				finished: false,
				mode: envelope.execution.mode,
				status: envelope.execution.status,
				startedAt: importedStartedAt,
				stoppedAt: importedStoppedAt,
				workflowId,
				waitTill: null,
				tracingContext: null,
				deduplicationKey: null,
				usedPrivateCredentials: false,
			});

			const restored = await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});
			if (!restored || restored.workflowId !== workflowId || restored.data === undefined) {
				throw new UnexpectedError('Imported execution could not be read back completely');
			}
			const expectedSnapshot: HistoricalWorkflowSnapshot = { ...snapshot, id: workflowId };
			const restoredSnapshot = this.toHistoricalSnapshot(restored.workflowData);
			const terminalMetadataMatches =
				restored.workflowId === workflowId &&
				restored.workflowVersionId === envelope.source.workflowVersionId &&
				restored.mode === envelope.execution.mode &&
				restored.status === envelope.execution.status &&
				(restored.waitTill === null || restored.waitTill === undefined) &&
				restored.startedAt.getTime() === importedStartedAt.getTime() &&
				restored.stoppedAt?.getTime() === importedStoppedAt.getTime();
			if (
				!terminalMetadataMatches ||
				!isDeepStrictEqual(restoredSnapshot, expectedSnapshot) ||
				!isDeepStrictEqual(restored.data, data)
			) {
				throw new UnexpectedError(
					'Imported execution readback did not match the native transformed payload',
				);
			}

			return {
				ok: true,
				workflowId,
				executionId,
				timestampOffsetMs,
				summary: this.summarize(restored.data, envelope.execution.status),
			};
		} catch (error) {
			if (executionId) {
				try {
					await this.executionPersistence.hardDeleteById(executionId);
				} catch (cleanupError) {
					this.logger.error('Failed to clean up an incomplete portable execution import', {
						executionId,
						error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
					});
				}
			}
			throw error;
		}
	}

	private async assertWorkflowAccess(
		user: User,
		workflowId: string,
		projectId: string,
		scopes: Scope[],
	): Promise<void> {
		const [workflow, owner] = await Promise.all([
			this.workflowFinderService.findWorkflowForUser(workflowId, user, scopes),
			this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId),
		]);
		if (!workflow || owner?.id !== projectId) throw new NotFoundError('Workflow not found');
	}

	private assertPortableExecution(
		execution: IExecutionBase,
		executionId: string,
	): asserts execution is IExecutionBase & {
		status: 'error' | 'crashed';
		startedAt: Date;
		stoppedAt: Date;
	} {
		if (this.activeExecutions.has(executionId)) throw dependencyError('it is still active');
		if (execution.status !== 'error' && execution.status !== 'crashed') {
			throw dependencyError(`status ${execution.status} is not a terminal failure`);
		}
		if (!execution.startedAt || !execution.stoppedAt) {
			throw dependencyError('its lifecycle timestamps are incomplete');
		}
		if (execution.waitTill) throw dependencyError('waitTill is present');
		if (execution.mode === 'retry' || execution.retryOf || execution.retrySuccessId) {
			throw dependencyError('it belongs to a retry graph');
		}
		if (execution.usedPrivateCredentials) {
			throw dependencyError('usedPrivateCredentials is true');
		}
	}

	private async parsePortableData(
		serialized: string,
		executionId: string,
	): Promise<IRunExecutionData> {
		let parsed: unknown;
		try {
			parsed = await parseFlatted(serialized);
		} catch (error) {
			throw BadRequestError.wrap(`Execution ${executionId} has corrupt serialized data`, error);
		}
		if (!isMigratableRunData(parsed)) {
			throw new BadRequestError(`Execution ${executionId} has invalid native run data`);
		}
		try {
			return migrateRunExecutionData(parsed);
		} catch (error) {
			throw BadRequestError.wrap(
				`Execution ${executionId} uses unsupported native run data`,
				error,
			);
		}
	}

	private assertPortableData(data: IRunExecutionData): void {
		if (data.waitTill !== undefined) throw dependencyError('run data waitTill is present');
		if (data.parentExecution) throw dependencyError('run data has a parent execution');
		if (data.parentAgentRun) throw dependencyError('run data has a parent agent run');
		if (data.redactionInfo?.isRedacted) throw dependencyError('run data is redacted');

		const runtimeData = data.executionData?.runtimeData;
		if (runtimeData?.parentExecutionId)
			throw dependencyError('runtimeData.parentExecutionId is set');
		if (runtimeData?.credentials !== undefined)
			throw dependencyError('runtimeData.credentials is set');
		if (runtimeData?.secureArtifacts !== undefined) {
			throw dependencyError('runtimeData.secureArtifacts is set');
		}
		if (runtimeData?.executedByUserId) {
			throw dependencyError('runtimeData.executedByUserId is set');
		}

		for (const [nodeName, runs] of Object.entries(data.resultData.runData)) {
			for (const [runIndex, run] of runs.entries()) {
				if (!isRecord(run)) {
					throw new BadRequestError(`runData.${nodeName}.${runIndex} must be an object`);
				}
				assertFiniteTimestamp(run.startTime, `runData.${nodeName}.${runIndex}.startTime`);
				if (!Number.isFinite(run.executionTime)) {
					throw new BadRequestError(`runData.${nodeName}.${runIndex}.executionTime must be finite`);
				}
				if (hasRelatedExecution(run.metadata)) {
					throw dependencyError(`runData.${nodeName}.${runIndex}.metadata has an execution link`);
				}
			}
		}

		const nodeExecutionStack = data.executionData?.nodeExecutionStack ?? [];
		if (!Array.isArray(nodeExecutionStack)) {
			throw new BadRequestError('executionData.nodeExecutionStack must be an array');
		}
		for (const [index, stackEntry] of nodeExecutionStack.entries()) {
			if (!isRecord(stackEntry)) {
				throw new BadRequestError(`executionData.nodeExecutionStack.${index} must be an object`);
			}
			if (hasRelatedExecution(stackEntry.metadata)) {
				throw dependencyError(
					`executionData.nodeExecutionStack.${index}.metadata has an execution link`,
				);
			}
		}
		for (const [nodeName, metadataEntries] of Object.entries(data.executionData?.metadata ?? {})) {
			if (!Array.isArray(metadataEntries)) {
				throw new BadRequestError(`executionData.metadata.${nodeName} must be an array`);
			}
			for (const [runIndex, metadata] of metadataEntries.entries()) {
				if (hasRelatedExecution(metadata)) {
					throw dependencyError(
						`executionData.metadata.${nodeName}.${runIndex} has an execution link`,
					);
				}
			}
		}

		if (hasExternalBinaryData(data)) throw dependencyError('run data has external binary data');
	}

	private removeSourceOperationalMetadata(data: IRunExecutionData): void {
		delete data.resumeToken;
		delete data.pushRef;
		if (!data.manualData) return;

		delete data.manualData.userId;
		delete data.manualData.evaluationRunId;
		delete data.manualData.suppressErrorWorkflow;
		if (Object.keys(data.manualData).length === 0) delete data.manualData;
	}

	private shiftDiagnosticTimestamps(data: IRunExecutionData, offsetMs: number): void {
		for (const runs of Object.values(data.resultData.runData)) {
			for (const run of runs) {
				run.startTime += offsetMs;
				assertFiniteTimestamp(run.startTime, 'shifted runData startTime');
			}
		}

		const runtimeData = data.executionData?.runtimeData;
		if (runtimeData) {
			assertFiniteTimestamp(runtimeData.establishedAt, 'runtimeData.establishedAt');
			runtimeData.establishedAt += offsetMs;
			assertFiniteTimestamp(runtimeData.establishedAt, 'shifted runtimeData.establishedAt');
		}
	}

	private summarize(
		data: IRunExecutionData,
		status: 'error' | 'crashed',
	): InstanceAiEvalFailedExecutionSummary {
		return {
			status,
			lastNodeExecuted: data.resultData.lastNodeExecuted ?? null,
			error: data.resultData.error
				? formatExecutionError(data.resultData.error, true)
				: 'Unknown error',
			nodeRunCounts: Object.fromEntries(
				Object.entries(data.resultData.runData).map(([nodeName, runs]) => [nodeName, runs.length]),
			),
		};
	}

	private toHistoricalSnapshot(workflowData: unknown): HistoricalWorkflowSnapshot {
		if (!isRecord(workflowData))
			throw new BadRequestError('Execution workflow snapshot is invalid');
		if (
			typeof workflowData.id !== 'string' ||
			typeof workflowData.name !== 'string' ||
			!Array.isArray(workflowData.nodes) ||
			!workflowData.nodes.every(isWorkflowNode) ||
			!isConnections(workflowData.connections) ||
			!isWorkflowSettings(workflowData.settings) ||
			(workflowData.nodeGroups !== undefined &&
				(!Array.isArray(workflowData.nodeGroups) ||
					!workflowData.nodeGroups.every(isWorkflowGroup)))
		) {
			throw new BadRequestError('Execution workflow snapshot is invalid');
		}

		return {
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			settings: workflowData.settings,
			nodeGroups: workflowData.nodeGroups,
		};
	}

	private assertEnvelopeConsistency(envelope: InstanceAiEvalFailedExecutionEnvelope): void {
		const snapshot = this.toHistoricalSnapshot(envelope.execution.workflowData);
		if (snapshot.id !== envelope.source.workflowId) {
			throw new BadRequestError('Portable execution workflow identities do not match');
		}
		this.parseDate(envelope.source.createdAt, 'source.createdAt');
	}

	private parseDate(value: string, path: string): Date {
		const date = new Date(value);
		if (!Number.isFinite(date.getTime())) throw new BadRequestError(`${path} must be a valid date`);
		return date;
	}
}
