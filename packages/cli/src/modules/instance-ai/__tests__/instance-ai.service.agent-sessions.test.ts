import type { User } from '@n8n/db';
import type { InstanceAiContext } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type {
	AgentExecutionService,
	ThreadDetail,
	ThreadListItem,
} from '../../agents/agent-execution.service';
import { InstanceAiService } from '../instance-ai.service';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

type ServiceInternals = {
	bindAgentSessionReader(context: InstanceAiContext, user: User): Promise<void>;
	getAgentExecutionService(): AgentExecutionService | null;
};

const user = mock<User>({ id: 'user-1' });

function makeThread(): ThreadListItem {
	return {
		id: 'thread-1',
		agentId: 'agent-1',
		agentName: 'Support Triage Agent',
		title: 'Failed support request',
		sessionNumber: 4,
		createdAt: new Date('2026-09-15T10:00:00.000Z'),
		updatedAt: new Date('2026-09-15T10:05:00.000Z'),
		status: 'error',
		source: 'preview',
		failureSummary: {
			count: 1,
			latest: {
				executionId: 'execution-1',
				kind: 'execution',
				name: null,
				message: 'Model call failed',
				occurredAt: 1,
			},
		},
		firstMessage: 'Help me',
		totalPromptTokens: 100,
		totalCompletionTokens: 50,
		totalCost: 0.01,
		totalDuration: 800,
		parentThreadId: null,
		parentAgentId: null,
		projectId: 'project-1',
		taskId: null,
		taskVersionId: null,
		emoji: null,
	} as ThreadListItem;
}

function makeDetail(): ThreadDetail {
	const listed = makeThread();
	return {
		thread: {
			...listed,
			generateId: vi.fn(),
			setUpdateDate: vi.fn(),
		} as ThreadDetail['thread'],
		executions: [
			{
				id: 'execution-1',
				status: 'error',
				duration: 800,
				model: 'test-model',
				totalTokens: 150,
				error: 'Model call failed',
				userMessage: 'Help me',
				timeline: [{ type: 'text', content: 'I could not finish.' }],
				source: 'preview',
				failureSummary: {
					count: 1,
					latest: {
						kind: 'execution',
						name: null,
						message: 'Model call failed',
						occurredAt: 1,
					},
				},
			} as ThreadDetail['executions'][number],
		],
	};
}

function makeContext(): InstanceAiContext {
	return { projectId: 'project-1' } as unknown as InstanceAiContext;
}

function makeService(
	executionService: Pick<AgentExecutionService, 'getThreads' | 'getThreadDetail'>,
) {
	const service = Object.create(InstanceAiService.prototype) as ServiceInternals;
	service.getAgentExecutionService = vi.fn(() => executionService as AgentExecutionService);
	return service;
}

describe('InstanceAiService Agent session binding', () => {
	beforeEach(() => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('binds list access to the current project with read scope', async () => {
		const thread = makeThread();
		const executionService = {
			getThreads: vi.fn().mockResolvedValue({ threads: [thread], nextCursor: 'next' }),
			getThreadDetail: vi.fn(),
		};
		const service = makeService(executionService);
		const context = makeContext();

		await service.bindAgentSessionReader(context, user);
		const result = await context.agentSessionService?.list({
			agentId: 'agent-1',
			limit: 5,
			status: 'error',
			updatedAfter: '2026-09-01T00:00:00.000Z',
		});

		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
			projectId: 'project-1',
		});
		expect(executionService.getThreads).toHaveBeenCalledWith('project-1', 'agent-1', 5, undefined, {
			status: 'error',
			updatedAfter: new Date('2026-09-01T00:00:00.000Z'),
		});
		expect(result).toEqual({
			sessions: [
				expect.objectContaining({
					threadId: 'thread-1',
					status: 'error',
					failureCount: 1,
				}),
			],
			nextCursor: 'next',
		});
	});

	it('returns a bounded transcript only for a session in the project and Agent', async () => {
		const detail = makeDetail();
		const executionService = {
			getThreads: vi.fn(),
			getThreadDetail: vi.fn().mockResolvedValue(detail),
		};
		const service = makeService(executionService);
		const context = makeContext();

		await service.bindAgentSessionReader(context, user);
		const result = await context.agentSessionService?.get({
			agentId: 'agent-1',
			threadId: 'thread-1',
		});

		expect(executionService.getThreadDetail).toHaveBeenCalledWith(
			'thread-1',
			'project-1',
			'agent-1',
		);
		expect(result?.session).toMatchObject({
			threadId: 'thread-1',
			status: 'error',
			failureCount: 1,
		});
		expect(result?.transcript).toContain('User: Help me');
		expect(result?.transcript).toContain('Assistant: I could not finish.');
	});

	it('does not expose the reader without Agent read scope', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(false);
		const executionService = {
			getThreads: vi.fn(),
			getThreadDetail: vi.fn(),
		};
		const service = makeService(executionService);
		const context = makeContext();

		await service.bindAgentSessionReader(context, user);

		expect(context.agentSessionService).toBeUndefined();
		expect(service.getAgentExecutionService).not.toHaveBeenCalled();
	});
});
