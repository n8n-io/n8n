import type { CredentialProvider } from '@n8n/agents';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentsService } from '../agents.service';
import { AgentsBuilderToolsService } from '../builder/agents-builder-tools.service';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

const AGENT_ID = 'agent-1';
const PROJECT_ID = 'project-1';
const TOOL_ID = 'greet';
const TOOL_CODE = 'export default new Tool("greet")...';

type AgentStub = { tools?: Record<string, { code?: string } | undefined> };

function makeService(agent: AgentStub | null = { tools: { [TOOL_ID]: { code: TOOL_CODE } } }) {
	const agentsService = mock<AgentsService>();
	agentsService.findById.mockResolvedValue(agent as never);

	const secureRuntime = mock<AgentSecureRuntime>();
	const workflowRepository = mock<WorkflowRepository>();
	workflowRepository.find.mockResolvedValue([]);

	const agentsToolsService = mock<AgentsToolsService>();
	agentsToolsService.getSharedTools.mockReturnValue([]);

	const service = new AgentsBuilderToolsService(
		agentsService,
		secureRuntime,
		workflowRepository,
		agentsToolsService,
	);

	const credentialProvider = mock<CredentialProvider>();
	const tools = service.getTools(AGENT_ID, PROJECT_ID, credentialProvider).shared;
	const testTool = tools.find((t) => t.name === 'test_custom_tool')!;

	return { service, agentsService, secureRuntime, testTool };
}

async function invoke(tool: ReturnType<typeof makeService>['testTool'], input: unknown) {
	return (await tool.handler!(input, {} as never)) as {
		ok: boolean;
		passed?: number;
		failed?: number;
		cases?: Array<{
			name: string;
			status: 'pass' | 'fail' | 'error';
			output?: unknown;
			expected?: unknown;
			error?: string;
		}>;
		errors?: Array<{ message: string }>;
	};
}

describe('AgentsBuilderToolsService / test_custom_tool', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('is registered alongside build_custom_tool in the shared tools', () => {
		const { service } = makeService();
		const credentialProvider = mock<CredentialProvider>();
		const names = service
			.getTools(AGENT_ID, PROJECT_ID, credentialProvider)
			.shared.map((t) => t.name);
		expect(names).toEqual(
			expect.arrayContaining(['build_custom_tool', 'test_custom_tool', 'list_workflows']),
		);
		expect(names.indexOf('test_custom_tool')).toBe(names.indexOf('build_custom_tool') + 1);
	});

	it('marks a case as pass when the output matches expected', async () => {
		const { secureRuntime, testTool } = makeService();
		secureRuntime.executeToolInIsolate.mockResolvedValue({ greeting: 'hi alice' });

		const result = await invoke(testTool, {
			id: TOOL_ID,
			cases: [{ name: 'happy', input: { name: 'alice' }, expected: { greeting: 'hi alice' } }],
		});

		expect(secureRuntime.executeToolInIsolate).toHaveBeenCalledWith(
			TOOL_CODE,
			{ name: 'alice' },
			{},
		);
		expect(result).toEqual({
			ok: true,
			passed: 1,
			failed: 0,
			cases: [
				{
					name: 'happy',
					status: 'pass',
					output: { greeting: 'hi alice' },
					expected: { greeting: 'hi alice' },
				},
			],
		});
	});

	it('marks a case as pass (no comparison) when expected is omitted', async () => {
		const { secureRuntime, testTool } = makeService();
		secureRuntime.executeToolInIsolate.mockResolvedValue('anything');

		const result = await invoke(testTool, {
			id: TOOL_ID,
			cases: [{ name: 'no-expected', input: { name: 'bob' } }],
		});

		expect(result.ok).toBe(true);
		expect(result.cases).toEqual([{ name: 'no-expected', status: 'pass', output: 'anything' }]);
	});

	it('marks a case as fail when actual output does not match expected', async () => {
		const { secureRuntime, testTool } = makeService();
		secureRuntime.executeToolInIsolate.mockResolvedValue({ greeting: 'hello alice' });

		const result = await invoke(testTool, {
			id: TOOL_ID,
			cases: [{ name: 'mismatch', input: { name: 'alice' }, expected: { greeting: 'hi alice' } }],
		});

		expect(result).toEqual({
			ok: false,
			passed: 0,
			failed: 1,
			cases: [
				{
					name: 'mismatch',
					status: 'fail',
					output: { greeting: 'hello alice' },
					expected: { greeting: 'hi alice' },
				},
			],
		});
	});

	it('marks a case as error when the handler throws, and continues subsequent cases', async () => {
		const { secureRuntime, testTool } = makeService();
		secureRuntime.executeToolInIsolate
			.mockRejectedValueOnce(new Error('handler timed out'))
			.mockResolvedValueOnce({ ok: true });

		const result = await invoke(testTool, {
			id: TOOL_ID,
			cases: [
				{ name: 'boom', input: { name: 'alice' } },
				{ name: 'after-boom', input: { name: 'bob' }, expected: { ok: true } },
			],
		});

		expect(secureRuntime.executeToolInIsolate).toHaveBeenCalledTimes(2);
		expect(result.ok).toBe(false);
		expect(result.passed).toBe(1);
		expect(result.failed).toBe(1);
		expect(result.cases).toEqual([
			{ name: 'boom', status: 'error', error: 'handler timed out' },
			{ name: 'after-boom', status: 'pass', output: { ok: true }, expected: { ok: true } },
		]);
	});

	it('returns a clear error when the tool id is unknown on the agent', async () => {
		const { secureRuntime, testTool } = makeService({ tools: {} });

		const result = await invoke(testTool, {
			id: 'missing',
			cases: [{ name: 'irrelevant', input: {} }],
		});

		expect(secureRuntime.executeToolInIsolate).not.toHaveBeenCalled();
		expect(result.ok).toBe(false);
		expect(result.errors?.[0]?.message).toContain('No custom tool with id "missing"');
	});

	it('returns a clear error when the agent cannot be found', async () => {
		const { secureRuntime, testTool } = makeService(null);

		const result = await invoke(testTool, {
			id: TOOL_ID,
			cases: [{ name: 'irrelevant', input: {} }],
		});

		expect(secureRuntime.executeToolInIsolate).not.toHaveBeenCalled();
		expect(result).toEqual({ ok: false, errors: [{ message: 'Agent not found' }] });
	});
});
