import { getWorkspaceRoot } from '@n8n/agents/sandbox';

import type { InstanceAiContext } from '../../../types';
import { runInSandbox } from '../../../workspace/sandbox-fs';
import { compileAgentSource } from '../agent-source-compiler';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/daytona/workspace')),
}));

vi.mock('../../../workspace/sandbox-fs', () => ({
	escapeSingleQuotes: (value: string) => value.replace(/'/g, "'\\''"),
	runInSandbox: vi.fn(),
}));

function makeContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		workspace: { sandbox: {} },
		logger: { warn: vi.fn(), debug: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

const ARTIFACT = {
	kind: 'n8n-agent-source',
	version: 1,
	core: {
		name: 'Support agent',
		model: '',
		credential: '',
		instructions: '',
		memory: { enabled: false, storage: 'n8n' },
		subAgents: { agents: [] },
		tools: [],
		skills: [],
		providerTools: {},
		mcpServers: [],
		vectorStores: [],
		config: {},
	},
	warnings: [],
};

describe('compileAgentSource', () => {
	beforeEach(() => vi.clearAllMocks());

	it('runs TypeScript agent source through the sandbox agent runner', async () => {
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 0,
			stdout: `tsx warning\n${JSON.stringify({ success: true, artifact: ARTIFACT })}`,
			stderr: '',
		});
		const context = makeContext();

		const result = await compileAgentSource(context, 'src/agents/support.agent.ts', 'agent source');

		expect(getWorkspaceRoot).toHaveBeenCalledWith(context.workspace);
		expect(runInSandbox).toHaveBeenCalledWith(
			context.workspace,
			"node --import tsx build-agent.mjs '/home/daytona/workspace/src/agents/support.agent.ts'",
			'/home/daytona/workspace',
		);
		expect(result).toEqual({
			success: true,
			compiler: 'agent-source-tsx',
			artifact: ARTIFACT,
		});
	});

	it('returns artifact diagnostics when the sandbox emits an unknown artifact version', async () => {
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 0,
			stdout: JSON.stringify({
				success: true,
				artifact: { ...ARTIFACT, version: 2 },
			}),
			stderr: '',
		});

		const result = await compileAgentSource(
			makeContext(),
			'src/agents/support.agent.ts',
			'agent source',
		);

		expect(result).toMatchObject({
			success: false,
			reason: 'agent_source_artifact_invalid',
			stage: 'artifact',
			editable: true,
		});
		if (!result.success) expect(result.errors[0]).toContain('version');
	});

	it('parses JSON compatibility sources without sandbox execution', async () => {
		const source = JSON.stringify({ name: 'Draft', model: '', instructions: '' });

		const result = await compileAgentSource(makeContext(), 'src/agents/support.agent.json', source);

		expect(result).toEqual({
			success: true,
			compiler: 'agent-json',
			json: { name: 'Draft', model: '', instructions: '' },
		});
		expect(runInSandbox).not.toHaveBeenCalled();
	});

	it('returns a structured failure when the sandbox is unavailable', async () => {
		const result = await compileAgentSource(
			makeContext({ workspace: undefined }),
			'src/agents/support.agent.ts',
			'agent source',
		);

		expect(result).toMatchObject({
			success: false,
			reason: 'agent_source_sandbox_unavailable',
			stage: 'source',
			editable: false,
		});
	});
});
