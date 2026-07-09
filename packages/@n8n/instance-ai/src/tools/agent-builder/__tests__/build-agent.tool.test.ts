import type { AgentJsonConfig } from '@n8n/api-types';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { createBuildAgentTool } from '../build-agent.tool';
import { getAgentConfigHash } from '../config-helpers';

const FILE_PATH = 'src/agents/support-agent.agent.json';

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
						writeFile: vi.fn(),
					},
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

	it('rejects empty instructions without persisting', async () => {
		const updateConfig = vi.fn();
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			updateConfig,
		});
		const context = createContext(service, {
			files: { [FILE_PATH]: JSON.stringify({ ...VALID_CONFIG, instructions: '   ' }) },
		});

		const result = await executeTool<{
			ok: boolean;
			stage?: string;
			errors?: Array<{ path: string }>;
		}>(createBuildAgentTool(context), { filePath: FILE_PATH, baseConfigHash: null }, {});

		expect(result.ok).toBe(false);
		expect(result.stage).toBe('validation');
		expect(result.errors?.some((e) => e.path === '/instructions')).toBe(true);
		expect(updateConfig).not.toHaveBeenCalled();
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
		expect(result.errors?.[0].message).toContain('Agent config file not found');
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
