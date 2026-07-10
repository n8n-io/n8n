import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { AgentJsonConfig } from '@n8n/api-types';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { runInSandbox } from '../../../workspace/sandbox-fs';
import { createBuildAgentTool } from '../build-agent.tool';
import { getAgentConfigHash } from '../config-helpers';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/daytona/workspace')),
}));

vi.mock('../../../workspace/sandbox-fs', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return { ...actual, runInSandbox: vi.fn() };
});

const FILE_PATH = 'src/agents/support-agent.agent.json';
const TS_FILE_PATH = 'src/agents/support-agent.agent.ts';

const VALID_CONFIG: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'cred-1',
	instructions: 'Answer support questions.',
};

function createService(
	overrides: Partial<InstanceAiAgentBuilderService> = {},
): InstanceAiAgentBuilderService {
	return {
		createAgent: vi.fn(),
		getConfigSnapshot: vi.fn(),
		updateConfig: vi.fn(),
		createSkill: vi.fn(),
		createTask: vi.fn(),
		describeCustomTool: vi.fn(),
		buildCustomTool: vi.fn(),
		listChatIntegrations: vi.fn(),
		listProjectAgents: vi.fn(),
		listAllProjectAgents: vi.fn(),
		isEpisodicMemoryManagedCredentialAvailable: vi.fn(),
		listModels: vi.fn(),
		searchMcpServers: vi.fn(),
		verifyMcpServer: vi.fn(),
		searchNodes: vi.fn(),
		resolveResourceLocatorOptions: vi.fn(),
		listAttachableWorkflows: vi.fn(),
		...overrides,
	};
}

function createContext(
	service: InstanceAiAgentBuilderService,
	options: { files?: Record<string, string>; workspace?: boolean } = {},
): InstanceAiContext {
	const files = options.files ?? {};
	const workspace =
		options.workspace === false
			? undefined
			: {
					filesystem: {
						readFile: vi.fn(async (path: string) => {
							if (path in files) return await Promise.resolve(files[path]);
							throw new Error(`ENOENT: ${path}`);
						}),
						writeFile: vi.fn(async (path: string, content: string | Buffer) => {
							files[path] = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
							await Promise.resolve();
						}),
					},
					sandbox: {},
				};
	return {
		userId: 'user-1',
		agentBuilderService: service,
		agentBuilderTarget: { agentId: 'agent-1', projectId: 'project-1' },
		workspace,
		logger: { debug: vi.fn(), warn: vi.fn() },
		// nodeTypesProvider intentionally omitted → dynamic-selector check is skipped.
	} as unknown as InstanceAiContext;
}

describe('build_agent tool', () => {
	beforeEach(() => vi.clearAllMocks());

	it('persists a valid config file when there is no prior config', async () => {
		const updateConfig = vi
			.fn()
			.mockResolvedValue({ config: VALID_CONFIG, updatedAt: 't2', versionId: 'v2' });
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			updateConfig,
		});
		const context = createContext(service, {
			files: { [FILE_PATH]: JSON.stringify(VALID_CONFIG) },
		});

		const result = await executeTool<{ ok: boolean; configHash?: string }>(
			createBuildAgentTool(context),
			{ filePath: FILE_PATH, baseConfigHash: null },
			{},
		);

		expect(result.ok).toBe(true);
		expect(result.configHash).toBe(getAgentConfigHash(VALID_CONFIG));
		// Native-web-search normalization may enrich the persisted config; assert the core fields.
		expect(updateConfig).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			expect.objectContaining({
				name: VALID_CONFIG.name,
				model: VALID_CONFIG.model,
				credential: VALID_CONFIG.credential,
				instructions: VALID_CONFIG.instructions,
			}),
		);
	});

	it('updates an existing config with a fresh baseConfigHash', async () => {
		const updated = { ...VALID_CONFIG, instructions: 'Updated instructions.' };
		const updateConfig = vi
			.fn()
			.mockResolvedValue({ config: updated, updatedAt: 't3', versionId: 'v3' });
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: VALID_CONFIG, updatedAt: 't', versionId: 'v1' }),
			updateConfig,
		});
		const context = createContext(service, { files: { [FILE_PATH]: JSON.stringify(updated) } });

		const result = await executeTool<{ ok: boolean }>(
			createBuildAgentTool(context),
			{ filePath: FILE_PATH, baseConfigHash: getAgentConfigHash(VALID_CONFIG) },
			{},
		);

		expect(result.ok).toBe(true);
		expect(updateConfig).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			expect.objectContaining({ instructions: 'Updated instructions.' }),
		);
	});

	it('rejects a stale baseConfigHash without persisting', async () => {
		const updateConfig = vi.fn();
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: VALID_CONFIG, updatedAt: 't', versionId: 'v1' }),
			updateConfig,
		});
		const context = createContext(service, {
			files: { [FILE_PATH]: JSON.stringify(VALID_CONFIG) },
		});

		const result = await executeTool<{ ok: boolean; stage?: string }>(
			createBuildAgentTool(context),
			{ filePath: FILE_PATH, baseConfigHash: 'stale-hash' },
			{},
		);

		expect(result).toMatchObject({ ok: false, stage: 'stale' });
		expect(updateConfig).not.toHaveBeenCalled();
	});

	it('rejects invalid JSON with a parse stage', async () => {
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
		});
		const context = createContext(service, { files: { [FILE_PATH]: '{ not json' } });

		const result = await executeTool<{ ok: boolean; stage?: string }>(
			createBuildAgentTool(context),
			{ filePath: FILE_PATH, baseConfigHash: null },
			{},
		);

		expect(result).toMatchObject({ ok: false, stage: 'parse' });
	});

	it('persists an incomplete config as a valid draft', async () => {
		const draft = { ...VALID_CONFIG, model: '', credential: '', instructions: '' };
		const updateConfig = vi
			.fn()
			.mockResolvedValue({ config: draft, updatedAt: 't2', versionId: 'v2' });
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			updateConfig,
		});
		const context = createContext(service, {
			files: { [FILE_PATH]: JSON.stringify(draft) },
		});

		const result = await executeTool<{
			ok: boolean;
			validation?: { status: string; missingSetup: string[] };
		}>(createBuildAgentTool(context), { filePath: FILE_PATH, baseConfigHash: null }, {});

		expect(result).toMatchObject({
			ok: true,
			validation: {
				status: 'valid-draft',
				missingSetup: ['model', 'credential', 'instructions'],
			},
		});
		expect(updateConfig).toHaveBeenCalled();
	});

	it('compiles and persists TypeScript Agent source in one call', async () => {
		const artifact = {
			kind: 'n8n-agent-source',
			version: 1,
			core: {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'cred-1',
				instructions: 'Answer support questions.',
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
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 0,
			stdout: JSON.stringify({ success: true, artifact }),
			stderr: '',
		});
		const updateConfig = vi
			.fn()
			.mockResolvedValue({ config: artifact.core, updatedAt: 't2', versionId: 'v2' });
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			updateConfig,
		});
		const context = createContext(service);
		const sourceCode =
			"import { agent } from '@n8n/workflow-sdk/agent';\nexport default agent('Support Agent');\n";

		const result = await executeTool<{
			ok: boolean;
			compiler?: string;
			sourceUpdated?: boolean;
			validation?: { status: string };
		}>(
			createBuildAgentTool(context),
			{ filePath: TS_FILE_PATH, sourceCode, baseConfigHash: null },
			{},
		);

		expect(context.workspace?.filesystem?.writeFile).toHaveBeenCalledWith(
			TS_FILE_PATH,
			sourceCode,
			{ recursive: true },
		);
		expect(getWorkspaceRoot).toHaveBeenCalledWith(context.workspace);
		expect(result).toMatchObject({
			ok: true,
			compiler: 'agent-source-tsx',
			sourceUpdated: false,
			validation: { status: 'runnable' },
		});
		expect(updateConfig).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			expect.objectContaining({
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				tools: [],
			}),
		);
	});

	it('requires hash-bound confirmation before removing stored custom tools or skills', async () => {
		const existing: AgentJsonConfig = {
			...VALID_CONFIG,
			tools: [{ type: 'custom', id: 'lookup_contract' }],
			skills: [{ type: 'skill', id: 'support-policy' }],
		};
		const updated: AgentJsonConfig = { ...VALID_CONFIG, tools: [], skills: [] };
		const updateConfig = vi
			.fn()
			.mockResolvedValue({ config: updated, updatedAt: 't2', versionId: 'v2' });
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: existing, updatedAt: 't1', versionId: 'v1' }),
			updateConfig,
		});
		const context = createContext(service, { files: { [FILE_PATH]: JSON.stringify(updated) } });
		const baseConfigHash = getAgentConfigHash(existing);

		const preflight = await executeTool<{
			ok: boolean;
			stage?: string;
			confirmationToken?: string;
			destructiveChanges?: { customToolIds: string[]; skillIds: string[] };
		}>(createBuildAgentTool(context), { filePath: FILE_PATH, baseConfigHash }, {});

		expect(preflight).toMatchObject({
			ok: false,
			stage: 'confirmation',
			destructiveChanges: {
				customToolIds: ['lookup_contract'],
				skillIds: ['support-policy'],
			},
		});
		expect(preflight.confirmationToken).toEqual(expect.any(String));
		expect(updateConfig).not.toHaveBeenCalled();

		const confirmed = await executeTool<{ ok: boolean }>(
			createBuildAgentTool(context),
			{
				filePath: FILE_PATH,
				baseConfigHash,
				destructiveChangeConfirmation: preflight.confirmationToken,
			},
			{},
		);

		expect(confirmed.ok).toBe(true);
		expect(updateConfig).toHaveBeenCalledOnce();
	});

	it('reports credential bindings removed by host sanitization', async () => {
		const candidate: AgentJsonConfig = {
			...VALID_CONFIG,
			credential: 'inaccessible-model-credential',
			tools: [
				{
					type: 'node',
					name: 'create_issue',
					node: {
						nodeType: 'n8n-nodes-base.linearTool',
						nodeTypeVersion: 1,
						nodeParameters: {
							credentialId: 'inaccessible-parameter-credential',
							credentials: {
								secondaryApi: {
									id: 'inaccessible-nested-credential',
									name: 'Secondary account',
								},
							},
						},
						credentials: {
							linearOAuth2Api: {
								id: 'inaccessible-node-credential',
								name: 'Linear account',
							},
						},
					},
				},
			],
		};
		const persisted: AgentJsonConfig = {
			...candidate,
			credential: '',
			tools: [
				{
					...candidate.tools?.[0],
					type: 'node',
					name: 'create_issue',
					node: {
						nodeType: 'n8n-nodes-base.linearTool',
						nodeTypeVersion: 1,
						nodeParameters: {
							credentialId: '',
							credentials: {
								secondaryApi: { id: '', name: 'Secondary account' },
							},
						},
						credentials: {
							linearOAuth2Api: { id: '', name: 'Linear account' },
						},
					},
				},
			],
		};
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			updateConfig: vi.fn().mockResolvedValue({
				config: persisted,
				updatedAt: 't2',
				versionId: 'v2',
			}),
		});
		const context = createContext(service, {
			files: { [FILE_PATH]: JSON.stringify(candidate) },
		});

		const result = await executeTool<{
			ok: boolean;
			validation?: { warnings: Array<{ code: string; path?: string; message: string }> };
		}>(createBuildAgentTool(context), { filePath: FILE_PATH, baseConfigHash: null }, {});

		expect(result.validation?.warnings).toMatchObject([
			{
				code: 'CREDENTIAL_BINDING_REMOVED',
				path: 'credential',
			},
			{
				code: 'CREDENTIAL_BINDING_REMOVED',
				path: 'tools.0.node.credentials.linearOAuth2Api.id',
			},
			{
				code: 'CREDENTIAL_BINDING_REMOVED',
				path: 'tools.0.node.nodeParameters.credentialId',
			},
			{
				code: 'CREDENTIAL_BINDING_REMOVED',
				path: 'tools.0.node.nodeParameters.credentials.secondaryApi.id',
			},
		]);
		expect(result.validation?.warnings[0]?.message).toContain('model');
		expect(result.validation?.warnings[1]?.message).toContain('create_issue');
		expect(result.validation?.warnings[2]?.message).toContain('create_issue');
		expect(result.validation?.warnings[3]?.message).toContain('create_issue');
	});

	it('rewrites TypeScript source when the host normalizes source-owned fields', async () => {
		const artifact = {
			kind: 'n8n-agent-source',
			version: 1,
			core: {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'inaccessible-credential',
				instructions: 'Answer support questions.',
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
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 0,
			stdout: JSON.stringify({ success: true, artifact }),
			stderr: '',
		});
		const persisted = { ...artifact.core, credential: '' };
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			updateConfig: vi.fn().mockResolvedValue({
				config: persisted,
				updatedAt: 't2',
				versionId: 'v2',
			}),
		});
		const context = createContext(service);
		const sourceCode = 'original source';

		const result = await executeTool<{ ok: boolean; sourceUpdated?: boolean }>(
			createBuildAgentTool(context),
			{ filePath: TS_FILE_PATH, sourceCode, baseConfigHash: null },
			{},
		);

		expect(result).toMatchObject({ ok: true, sourceUpdated: true });
		const writeFile = context.workspace?.filesystem?.writeFile;
		if (!writeFile) throw new Error('Expected workspace writeFile mock');
		const writes = vi.mocked(writeFile).mock.calls;
		expect(writes).toHaveLength(2);
		expect(writes[1]?.[1]).toContain('.model({');
		expect(writes[1]?.[1]).not.toContain('inaccessible-credential');
	});

	it('reports source regeneration failures without hiding a successful persistence', async () => {
		const persisted = { ...VALID_CONFIG, name: ' ' };
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			updateConfig: vi.fn().mockResolvedValue({
				config: persisted,
				updatedAt: 't2',
				versionId: 'v2',
			}),
		});
		const context = createContext(service, {
			files: { [FILE_PATH]: JSON.stringify(VALID_CONFIG) },
		});

		const result = await executeTool<{
			ok: boolean;
			sourceUpdated?: boolean;
			validation?: { warnings: Array<{ code: string; message: string }> };
		}>(createBuildAgentTool(context), { filePath: FILE_PATH, baseConfigHash: null }, {});

		expect(result).toMatchObject({ ok: true, sourceUpdated: false });
		expect(result.validation?.warnings).toHaveLength(1);
		expect(result.validation?.warnings[0]?.code).toBe('SOURCE_SYNC_FAILED');
		expect(result.validation?.warnings[0]?.message).toContain('saved');
	});

	it('preserves strict host reference paths in build diagnostics', async () => {
		const referenceError = Object.assign(new Error('Unavailable references'), {
			code: 'AGENT_CONFIG_REFERENCE_VALIDATION',
			issues: [
				{
					path: 'tools.0.workflow',
					message: 'Workflow "missing-workflow" is unavailable.',
				},
			],
		});
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			updateConfig: vi.fn().mockRejectedValue(referenceError),
		});
		const context = createContext(service, {
			files: { [FILE_PATH]: JSON.stringify(VALID_CONFIG) },
		});

		const result = await executeTool<{
			ok: boolean;
			stage?: string;
			errors?: Array<{ path: string; message: string }>;
		}>(createBuildAgentTool(context), { filePath: FILE_PATH, baseConfigHash: null }, {});

		expect(result).toMatchObject({
			ok: false,
			stage: 'reference-validation',
			errors: [
				{
					path: 'tools.0.workflow',
					message: 'Workflow "missing-workflow" is unavailable.',
				},
			],
		});
	});

	it('preserves host node validation metadata in build diagnostics', async () => {
		const nodeError = Object.assign(new Error('Invalid node tool'), {
			code: 'AGENT_CONFIG_NODE_VALIDATION',
			issues: [
				{
					code: 'INVALID_NODE_PARAMETERS',
					path: 'tools.0.node.nodeParameters.operation',
					message: 'Invalid operation value.',
					toolName: 'create_issue',
					nodeType: 'n8n-nodes-base.linearTool',
					nodeTypeVersion: 1,
				},
			],
		});
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			updateConfig: vi.fn().mockRejectedValue(nodeError),
		});
		const context = createContext(service, {
			files: { [FILE_PATH]: JSON.stringify(VALID_CONFIG) },
		});

		const result = await executeTool<{
			ok: boolean;
			stage?: string;
			errors?: Array<{ path: string; toolName?: string }>;
		}>(createBuildAgentTool(context), { filePath: FILE_PATH, baseConfigHash: null }, {});

		expect(result).toMatchObject({
			ok: false,
			stage: 'node-validation',
			errors: [
				{
					path: 'tools.0.node.nodeParameters.operation',
					toolName: 'create_issue',
				},
			],
		});
	});

	it('reports a structured error when the workspace is unavailable', async () => {
		const context = createContext(createService(), { workspace: false });

		const result = await executeTool<{ ok: boolean; errors?: Array<{ message: string }> }>(
			createBuildAgentTool(context),
			{ filePath: FILE_PATH, baseConfigHash: null },
			{},
		);

		expect(result.ok).toBe(false);
		expect(result.errors?.[0].message).toContain('workspace is unavailable');
	});

	it('reports a structured error when the config file is missing', async () => {
		const context = createContext(createService(), { files: {} });

		const result = await executeTool<{ ok: boolean; errors?: Array<{ message: string }> }>(
			createBuildAgentTool(context),
			{ filePath: FILE_PATH, baseConfigHash: null },
			{},
		);

		expect(result.ok).toBe(false);
		expect(result.errors?.[0].message).toContain('Agent source file not found');
	});

	it('rejects a path escaping the workspace root', async () => {
		const context = createContext(createService(), { files: {} });

		const result = await executeTool<{ ok: boolean; errors?: Array<{ message: string }> }>(
			createBuildAgentTool(context),
			{ filePath: '../outside.json', baseConfigHash: null },
			{},
		);

		expect(result.ok).toBe(false);
		expect(result.errors?.[0].message).toContain('workspace root');
	});
});
