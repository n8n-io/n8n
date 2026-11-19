import { mockLogger } from '@n8n/backend-test-utils';
import type { EventMap, EventService } from '@n8n/backend-services';
import type { InstanceSettings } from 'n8n-core';
import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ProjectAgent } from '@/modules/agents/entities/agent.entity';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { AgentDeterminismListener } from '../agent-determinism.listener';
import type {
	DeterminismSourceRepository,
	RunCount,
} from '../database/determinism-source.repository';
import type { DeterminismAnalysisService } from '../determinism-analysis.service';

type Handlers = {
	'workflow-post-execute': (event: EventMap['workflow-post-execute']) => Promise<void>;
	'agent-execution-finished': (event: EventMap['agent-execution-finished']) => Promise<void>;
};

const agentNode = { name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' } as INode;
const setNode = { name: 'Set', type: 'n8n-nodes-base.set' } as INode;

function workflowEvent(
	overrides: { nodes?: INode[]; status?: IRun['status']; mode?: IRun['mode']; meta?: object } = {},
): EventMap['workflow-post-execute'] {
	return {
		executionId: 'exec-1',
		userId: 'user-1',
		projectId: 'project-1',
		workflow: {
			id: 'wf-1',
			name: 'Backport reminder',
			versionId: 'v1',
			nodes: overrides.nodes ?? [agentNode, setNode],
			meta: overrides.meta ?? {},
		} as IWorkflowBase,
		runData: { status: overrides.status ?? 'success', mode: overrides.mode ?? 'webhook' } as IRun,
	};
}

function agentEvent(
	overrides: Partial<EventMap['agent-execution-finished']> = {},
): EventMap['agent-execution-finished'] {
	return {
		agentId: 'agent-1',
		projectId: 'project-1',
		executionId: 'exec-1',
		status: 'success',
		runType: 'production',
		userId: 'user-1',
		...overrides,
	};
}

describe('AgentDeterminismListener', () => {
	const sourceRepository = mock<DeterminismSourceRepository>();
	const agentRepository = mock<AgentRepository>();
	const analysis = mock<DeterminismAnalysisService>();
	let instanceSettings: InstanceSettings;
	let handlers: Handlers;

	const counted = (count: Partial<RunCount>) =>
		sourceRepository.recordSuccessfulRun.mockResolvedValue({
			runsSinceAnalysis: 1,
			versionChanged: false,
			analyzedVersionHash: null,
			...count,
		});

	beforeEach(() => {
		vi.clearAllMocks();
		instanceSettings = mock<InstanceSettings>({ isLeader: true });
		const eventService = mock<EventService>();
		const registered: Partial<Handlers> = {};
		eventService.on.mockImplementation((name, handler) => {
			Object.assign(registered, { [name]: handler });
			return eventService;
		});
		new AgentDeterminismListener(
			eventService,
			sourceRepository,
			agentRepository,
			analysis,
			instanceSettings,
			mockLogger(),
		).init();
		handlers = registered as Handlers;
		agentRepository.findById.mockResolvedValue(
			mock<ProjectAgent>({ name: 'Triage agent', activeVersionId: 'av1', versionId: 'd1' }),
		);
		counted({});
	});

	it('queues an analysis at 20 runs but not at 19', async () => {
		counted({ runsSinceAnalysis: 19 });
		await handlers['workflow-post-execute'](workflowEvent());
		expect(analysis.enqueue).not.toHaveBeenCalled();

		counted({ runsSinceAnalysis: 20 });
		await handlers['workflow-post-execute'](workflowEvent());
		expect(analysis.enqueue).toHaveBeenCalledWith(
			{
				type: 'workflow',
				id: 'wf-1',
				projectId: 'project-1',
				name: 'Backport reminder',
				versionHash: 'v1',
			},
			'user-1',
		);
	});

	it('queues an analysis when an analysed source gets a new version', async () => {
		counted({ runsSinceAnalysis: 1, versionChanged: true, analyzedVersionHash: 'old' });
		await handlers['agent-execution-finished'](agentEvent());
		expect(analysis.enqueue).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'agent', id: 'agent-1', versionHash: 'av1' }),
			'user-1',
		);
	});

	it('counts on a follower but does not queue', async () => {
		Object.assign(instanceSettings, { isLeader: false });
		counted({ runsSinceAnalysis: 20 });
		await handlers['workflow-post-execute'](workflowEvent());
		expect(sourceRepository.recordSuccessfulRun).toHaveBeenCalled();
		expect(analysis.enqueue).not.toHaveBeenCalled();
	});

	it.each([
		['a failed run', workflowEvent({ status: 'error' })],
		['a manual run', workflowEvent({ mode: 'manual' })],
		['an evaluation run', workflowEvent({ mode: 'evaluation' })],
		['a workflow without an Agent node', workflowEvent({ nodes: [setNode] })],
		['a workflow with two Agent nodes', workflowEvent({ nodes: [agentNode, agentNode] })],
		[
			'a generated draft',
			workflowEvent({ meta: { generatedFrom: { type: 'agent', id: 'a', versionHash: 'v' } } }),
		],
	])('skips %s', async (_, event) => {
		await handlers['workflow-post-execute'](event);
		expect(sourceRepository.recordSuccessfulRun).not.toHaveBeenCalled();
	});

	it.each([
		['a test run', agentEvent({ runType: 'test' })],
		['a run without a run type', agentEvent({ runType: null })],
		['a failed run', agentEvent({ status: 'error' })],
	])('skips an agent %s', async (_, event) => {
		await handlers['agent-execution-finished'](event);
		expect(sourceRepository.recordSuccessfulRun).not.toHaveBeenCalled();
	});

	it('logs a repository failure instead of throwing', async () => {
		sourceRepository.recordSuccessfulRun.mockRejectedValue(new Error('db down'));
		await expect(handlers['workflow-post-execute'](workflowEvent())).resolves.toBeUndefined();
		expect(analysis.enqueue).not.toHaveBeenCalled();
	});
});
