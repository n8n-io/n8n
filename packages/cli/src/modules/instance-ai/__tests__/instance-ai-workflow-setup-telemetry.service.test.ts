import { INSTANCE_AI_SETUP_PANEL_FLAG } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Logger } from '@n8n/backend-common';
import type { User, UserRepository, WorkflowDependencyRepository } from '@n8n/db';
import {
	analyzeWorkflow,
	type InstanceAiContext,
	type InstanceAiWorkflowService,
} from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { PostHogClient } from '@/posthog';
import type { Telemetry } from '@/telemetry';

import type { InstanceAiThread } from '../entities/instance-ai-thread.entity';
import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import { InstanceAiWorkflowSetupTelemetryService } from '../instance-ai-workflow-setup-telemetry.service';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';
import type {
	InstanceAiWorkflowSetupRepository,
	WorkflowSetupTelemetryState,
} from '../repositories/instance-ai-workflow-setup.repository';

vi.mock('@n8n/instance-ai', () => ({ analyzeWorkflow: vi.fn(async () => []) }));
vi.mock('../instance-ai.adapter.service', () => ({
	InstanceAiAdapterService: class {},
	resolveDisplayedDefaults: vi.fn(),
}));

describe('InstanceAiWorkflowSetupTelemetryService', () => {
	const repository = mock<InstanceAiWorkflowSetupRepository>();
	const threads = mock<InstanceAiThreadRepository>();
	const telemetry = mock<Telemetry>();
	const posthog = mock<PostHogClient>();
	const user = mock<User>({ id: 'user-1' });
	const workflowService = mock<InstanceAiWorkflowService>();
	const context = mock<InstanceAiContext>({ workflowService });
	const adapter = mockInstance(InstanceAiAdapterService);
	const service = new InstanceAiWorkflowSetupTelemetryService(
		repository,
		threads,
		mock<UserRepository>(),
		mock<WorkflowDependencyRepository>(),
		telemetry,
		mock<Logger>(),
		mock<EventService>(),
		posthog,
	);
	let state: WorkflowSetupTelemetryState | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		state = undefined;
		adapter.createContext.mockReturnValue(context);
		workflowService.getAsWorkflowJSON.mockResolvedValue({
			id: 'workflow-1',
			name: 'Workflow',
			nodes: [],
			connections: {},
		});
		vi.mocked(analyzeWorkflow).mockResolvedValue([]);
		threads.findOneBy.mockResolvedValue(
			mock<InstanceAiThread>({ metadata: { workflowSetupSessionId: 'session-1' } }),
		);
		repository.read.mockImplementation(async () => state);
		repository.updateObservation.mockImplementation(async (_workflowId, update) => {
			state = await update(state);
		});
	});

	it.each(['control', 'variant', undefined, false])(
		'preserves the initial assignment %s for later observations and executions',
		async (assignment) => {
			posthog.getFeatureFlags.mockResolvedValue(
				assignment === undefined ? {} : { [INSTANCE_AI_SETUP_PANEL_FLAG]: assignment },
			);
			await service.observe(user, 'thread-1', 'workflow-1', false);
			const variant = typeof assignment === 'string' ? assignment : undefined;
			expect(state?.snapshot.variant).toBe(variant);
			posthog.getFeatureFlags.mockResolvedValue({
				[INSTANCE_AI_SETUP_PANEL_FLAG]: assignment === 'variant' ? 'control' : 'variant',
			});
			await service.observe(user, 'thread-2', 'workflow-1', true);
			expect(telemetry.track).toHaveBeenLastCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.WORKFLOW_SETUP_STATE_OBSERVED,
				expect.objectContaining({ build_complete: true }),
			);
			expect(state?.snapshot.variant).toBe(variant);
			expect(state?.snapshot['$feature/118_instance_ai_setup_overhaul']).toBe(variant);
			await service.recordTestResult('workflow-1', {
				thread_id: 'thread-2',
				session_id: 'session-2',
				test_request_id: 'request-2',
				execution_id: 'execution-2',
				source: 'instance_ai_setup_panel',
				initiated_by: 'user',
				status: 'success',
			});
			expect(telemetry.track).toHaveBeenLastCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.SETUP_TEST_FINISHED,
				expect.objectContaining({
					workflow_id: 'workflow-1',
					thread_id: 'thread-2',
					session_id: 'session-2',
					test_request_id: 'request-2',
				}),
			);
			const properties = telemetry.track.mock.calls.at(-1)?.[1];
			expect(properties?.variant).toBe(variant);
			expect(properties?.['$feature/118_instance_ai_setup_overhaul']).toBe(variant);
			expect(state?.snapshot.thread_id).toBe('thread-1');
		},
	);
});
