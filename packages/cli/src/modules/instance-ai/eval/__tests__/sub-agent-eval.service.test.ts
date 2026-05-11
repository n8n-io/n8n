import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { InstanceAiAdapterService } from '../../instance-ai.adapter.service';
import type { InstanceAiService } from '../../instance-ai.service';
import { SubAgentEvalService } from '../sub-agent-eval.service';

function makeAgentResult(
	overrides: Partial<{
		text: string;
		toolCalls: unknown[];
		toolResults: unknown[];
		finishReason: string;
	}> = {},
) {
	return {
		text: 'done',
		toolCalls: [],
		toolResults: [],
		finishReason: 'stop',
		...overrides,
	};
}

jest.mock('@n8n/instance-ai', () => ({
	// BUILDER_AGENT_PROMPT is imported by sub-agent-roles.ts; provide a stub string.
	BUILDER_AGENT_PROMPT: 'stub-builder-prompt',
	MAX_STEPS: { BUILDER: 60 },
	createSubAgent: jest.fn(() => ({
		generate: jest.fn().mockResolvedValue({
			text: 'done',
			toolCalls: [],
			toolResults: [],
			finishReason: 'stop',
		}),
	})),
	createAllTools: jest.fn(() => ({})),
}));

describe('SubAgentEvalService', () => {
	const adapter = mock<InstanceAiAdapterService>();
	const instanceAiService = mock<InstanceAiService>();
	const user = mock<User>({ id: 'user-1' });
	const logger = mock<Logger>();

	let service: SubAgentEvalService;

	beforeEach(() => {
		jest.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		service = new SubAgentEvalService(adapter, instanceAiService, logger);
		instanceAiService.resolveAgentModelConfig.mockResolvedValue(
			'anthropic/claude-sonnet-4-20250514',
		);
	});

	it('throws when the role is unknown', async () => {
		await expect(service.run(user, { role: 'does-not-exist', prompt: 'hi' })).rejects.toThrow(
			/Unknown sub-agent role "does-not-exist"/,
		);
	});

	it('captures workflow IDs created during the run', async () => {
		const createdIds: string[] = [];
		const workflowService = {
			createFromWorkflowJSON: jest.fn(async () => {
				const detail = { id: `wf-${createdIds.length + 1}` };
				createdIds.push(detail.id);
				return detail;
			}),
			updateFromWorkflowJSON: jest.fn(async () => ({ id: 'wf-updated' })),
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			delete: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
		};
		adapter.createContext.mockReturnValue({
			userId: user.id,
			workflowService,
			executionService: {} as never,
			credentialService: {} as never,
			nodeService: {} as never,
			dataTableService: {} as never,
		} as never);

		const { createSubAgent, createAllTools } = jest.requireMock('@n8n/instance-ai');
		createSubAgent.mockImplementation(() => ({
			generate: jest.fn(async () => {
				// The service passes the WRAPPED context to createAllTools — use it to get
				// the wrapped workflowService so the capture interceptor fires correctly.
				const wrappedCtx = createAllTools.mock.calls[0][0] as {
					workflowService: typeof workflowService;
				};
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await (wrappedCtx.workflowService.createFromWorkflowJSON as any)({ name: 'A' });
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await (wrappedCtx.workflowService.createFromWorkflowJSON as any)({ name: 'B' });
				return makeAgentResult({ text: 'built two workflows' });
			}),
		}));

		const result = await service.run(user, { role: 'builder', prompt: 'build something' });

		expect(result.capturedWorkflowIds).toEqual(['wf-1', 'wf-2']);
		expect(result.text).toBe('built two workflows');
	});

	it('aborts the run when the timeout fires', async () => {
		adapter.createContext.mockReturnValue({
			userId: user.id,
			workflowService: {
				createFromWorkflowJSON: jest.fn(),
				updateFromWorkflowJSON: jest.fn(),
			},
		} as never);

		const { createSubAgent } = jest.requireMock('@n8n/instance-ai');
		createSubAgent.mockReturnValue({
			generate: jest.fn(
				async (_prompt: string, opts: { abortSignal: AbortSignal }) =>
					await new Promise((_resolve, reject) => {
						opts.abortSignal.addEventListener('abort', () => reject(opts.abortSignal.reason));
					}),
			),
		});

		const result = await service.run(user, { role: 'builder', prompt: 'hang', timeoutMs: 10 });
		expect(result.error).toMatch(/timed out/i);
	});

	it('serializes mastra-shaped tool calls and results', async () => {
		adapter.createContext.mockReturnValue({
			userId: user.id,
			workflowService: {
				createFromWorkflowJSON: jest.fn(),
				updateFromWorkflowJSON: jest.fn(),
			},
		} as never);

		const { createSubAgent } = jest.requireMock('@n8n/instance-ai');
		createSubAgent.mockReturnValue({
			generate: jest.fn(async () => ({
				text: 'ok',
				toolCalls: [{ payload: { toolName: 'nodes', args: { action: 'list' } } }],
				toolResults: [{ payload: { toolName: 'nodes', result: { success: true, items: [] } } }],
				finishReason: 'stop',
			})),
		});

		const result = await service.run(user, { role: 'builder', prompt: 'inspect' });

		expect(result.toolCalls).toEqual([{ toolName: 'nodes', args: { action: 'list' } }]);
		expect(result.toolResults).toEqual([
			{ toolName: 'nodes', result: { success: true, items: [] }, isError: false },
		]);
	});
});
