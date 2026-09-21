import { instanceAiSetupRequirementId } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository, WorkflowDependencyRepository, type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import isEqual from 'lodash/isEqual';
import { NodeHelpers } from 'n8n-workflow';
import { z } from 'zod';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { Telemetry } from '@/telemetry';

import { InstanceAiThreadRepository } from './repositories/instance-ai-thread.repository';
import {
	InstanceAiWorkflowSetupRepository,
	type WorkflowSetupTelemetryState,
} from './repositories/instance-ai-workflow-setup.repository';

type Snapshot = WorkflowSetupTelemetryState['snapshot'];
type TestResult = InferTelemetryProps<typeof TELEMETRY_EVENT.INSTANCE_AI.SETUP_TEST_FINISHED>;
const sessionIdSchema = z.string().min(1).max(128);

@Service()
export class InstanceAiWorkflowSetupTelemetryService {
	constructor(
		private readonly repository: InstanceAiWorkflowSetupRepository,
		private readonly threads: InstanceAiThreadRepository,
		private readonly users: UserRepository,
		private readonly dependencies: WorkflowDependencyRepository,
		private readonly telemetry: Telemetry,
		private readonly logger: Logger,
		events: EventService,
	) {
		events.on('workflow-saved', ({ workflow }) => {
			void this.observeExisting(workflow.id);
		});
		events.on('instance-ai-setup-test-cancelled', ({ workflowId, request }) => {
			void this.recordTestResult(workflowId, {
				...request,
				source: 'instance_ai_setup_panel',
				initiated_by: 'user',
				status: 'canceled',
			});
		});
		events.on('instance-ai-setup-test-start-failed', ({ workflowId }) => {
			void this.recordTestResult(workflowId, {
				source: 'canvas',
				initiated_by: 'user',
				status: 'start_failed',
				error_type: 'start',
			});
		});
		events.on('workflow-post-execute', (event) => {
			void this.executionFinished(event);
		});
		events.on('credentials-deleted', ({ credentialId }) => {
			void this.credentialDeleted(credentialId);
		});
		events.on('workflow-deleted', ({ workflowId }) => {
			void this.repository.removeForWorkflow(workflowId).catch(() => {});
		});
	}

	private async credentialDeleted(credentialId: string) {
		try {
			for (const workflowId of await this.dependencies.findWorkflowIdsUsingCredential(credentialId))
				await this.observeExisting(workflowId);
		} catch {
			this.logger.debug('Could not observe workflow setup after credential removal');
		}
	}

	async rememberSession(threadId: string, pushRef: unknown): Promise<void> {
		const sessionId = sessionIdSchema.safeParse(pushRef);
		if (!sessionId.success) return;
		try {
			await this.threads.updateThread({
				threadId,
				update: ({ metadata }) => ({
					metadata: { ...metadata, workflowSetupSessionId: sessionId.data },
				}),
			});
		} catch {
			this.logger.debug('Could not remember workflow setup telemetry context');
		}
	}

	async observeExisting(workflowId: string): Promise<void> {
		try {
			const previous = await this.repository.read(workflowId);
			if (!previous) return;
			const user = await this.users.findByIdWithRole(previous.snapshot.user_id);
			if (user) await this.observe(user, previous.snapshot.thread_id, workflowId);
		} catch {
			this.logger.debug('Could not observe saved workflow setup');
		}
	}

	async observe(
		user: User,
		threadId: string,
		workflowId: string,
		buildComplete?: boolean,
	): Promise<void> {
		try {
			const { analyzeWorkflow } = await import('@n8n/instance-ai');
			const { InstanceAiAdapterService, resolveDisplayedDefaults } = await import(
				'./instance-ai.adapter.service.js'
			);
			const context = Container.get(InstanceAiAdapterService).createContext(user, { threadId });
			const thread = await this.threads.findOneBy({ id: threadId });
			const sessionId = sessionIdSchema.safeParse(thread?.metadata?.workflowSetupSessionId);
			let changed: Snapshot | undefined;
			await this.repository.updateObservation(workflowId, async (previous) => {
				const workflow = await context.workflowService.getAsWorkflowJSON(workflowId);
				const requests = await analyzeWorkflow(context, workflowId, undefined, {
					includeSettled: true,
					validationMode: 'configuration',
				});
				const nodes = new Map(
					workflow.nodes.filter((node) => !node.disabled).map((node) => [node.id, node]),
				);
				const items = new Map<string, Snapshot['items'][number]>();
				// A resolved parameter leaves analysis. Retain its identity while its node remains.
				for (const item of previous?.snapshot.items ?? []) {
					const node = nodes.get(item.node_id);
					if (
						item.kind !== 'parameter' ||
						!item.parameter_name ||
						!node ||
						!Object.hasOwn(node.parameters ?? {}, item.parameter_name)
					)
						continue;
					const description = context.nodeTypesProvider?.getByNameAndVersion(
						node.type,
						node.typeVersion,
					)?.description;
					if (!description) continue;
					const parameters = resolveDisplayedDefaults(
						description.properties,
						node.parameters ?? {},
						node.type,
						node.typeVersion ?? 1,
						description,
					);
					if (
						!description.properties.some(
							(property) =>
								property.name === item.parameter_name &&
								property.type !== 'hidden' &&
								NodeHelpers.displayParameter(
									parameters,
									property,
									{ typeVersion: node.typeVersion ?? 1 },
									description,
								),
						)
					)
						continue;
					items.set(item.item_id, { ...item, is_complete: true });
				}
				for (const request of requests) {
					const node = nodes.get(request.node.id);
					if (!node) continue;
					const base = { node_id: request.node.id, node_type: request.node.type };
					if (request.credentialType) {
						const id = instanceAiSetupRequirementId(
							workflowId,
							request.node.id,
							'credential',
							request.credentialType,
						);
						items.set(id, {
							...base,
							item_id: id,
							kind: 'credential',
							credential_type: request.credentialType,
							is_complete: request.credentialNeedsAction !== true,
						});
					}
					for (const name of Object.keys(request.parameterIssues ?? {})) {
						const id = instanceAiSetupRequirementId(workflowId, request.node.id, 'parameter', name);
						items.set(id, {
							...base,
							item_id: id,
							kind: 'parameter',
							parameter_name: name,
							is_complete: false,
						});
					}
				}
				const requirements = [...items.values()].sort((a, b) => a.item_id.localeCompare(b.item_id));
				const credentials = requirements.filter((item) => item.kind === 'credential');
				const parameters = requirements.filter((item) => item.kind === 'parameter');
				const alreadyConnectedIds =
					previous?.alreadyConnectedIds ??
					credentials.filter((item) => item.is_complete).map((item) => item.item_id);
				const build = buildComplete ?? previous?.snapshot.build_complete ?? false;
				const snapshot: Snapshot = {
					...(sessionId.success ? { session_id: sessionId.data } : {}),
					workflow_id: workflowId,
					thread_id: previous?.snapshot.thread_id ?? threadId,
					user_id: previous?.snapshot.user_id ?? user.id,
					cohort_started_at: previous?.snapshot.cohort_started_at ?? new Date().toISOString(),
					credential_count: credentials.length,
					parameter_count: parameters.length,
					pending_credential_count: credentials.filter((item) => !item.is_complete).length,
					pending_parameter_count: parameters.filter((item) => !item.is_complete).length,
					already_connected_count: credentials.filter((item) =>
						alreadyConnectedIds.includes(item.item_id),
					).length,
					build_complete: build,
					setup_complete: build && requirements.every((item) => item.is_complete),
					items: requirements,
				};
				if (
					!previous ||
					!isEqual(previous.snapshot.items, snapshot.items) ||
					previous.snapshot.build_complete !== build
				)
					changed = snapshot;
				return {
					snapshot,
					alreadyConnectedIds,
				};
			});
			if (changed)
				this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.WORKFLOW_SETUP_STATE_OBSERVED, changed);
		} catch {
			this.logger.debug('Could not record workflow setup telemetry');
		}
	}

	async executionFinished(event: RelayEventMap['workflow-post-execute']): Promise<void> {
		const { runData, workflow, telemetryMetadata, executionId, source } = event;
		if (
			!workflow.id ||
			!runData ||
			telemetryMetadata?.mockDataSources?.length ||
			Object.keys(runData.data.resultData.pinData ?? {}).length
		)
			return;
		const status = runData.status;
		if (status !== 'success' && status !== 'error' && status !== 'canceled' && status !== 'crashed')
			return;
		await this.recordTestResult(workflow.id, {
			execution_id: executionId,
			...(telemetryMetadata?.setupTestRequest ?? {}),
			source: telemetryMetadata?.setupTestRequest
				? 'instance_ai_setup_panel'
				: source === 'instance_ai'
					? 'assistant'
					: 'canvas',
			initiated_by: source === 'instance_ai' ? 'assistant' : 'user',
			status: status === 'crashed' ? 'error' : status,
			...(status === 'error' || status === 'crashed' ? { error_type: 'execution' } : {}),
		});
	}

	async recordTestResult(
		workflowId: string,
		result: Omit<TestResult, 'workflow_id' | 'thread_id'>,
	): Promise<void> {
		try {
			const state = await this.repository.read(workflowId);
			if (!state || ('thread_id' in result && result.thread_id !== state.snapshot.thread_id))
				return;
			const { user_id, workflow_id, thread_id, session_id } = state.snapshot;
			this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.SETUP_TEST_FINISHED, {
				user_id,
				workflow_id,
				thread_id,
				session_id,
				...result,
			});
		} catch {
			this.logger.debug('Could not record workflow setup execution result');
		}
	}
}
