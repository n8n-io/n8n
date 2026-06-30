import type { AgentJsonConfig } from '@n8n/api-types';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { getAgentConfigHash } from '../config-helpers';
import {
	createPatchConfigTool,
	createReadConfigTool,
	createWriteConfigTool,
} from '../config-tools';

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
		listModels: vi.fn(),
		searchMcpServers: vi.fn(),
		verifyMcpServer: vi.fn(),
		searchNodes: vi.fn(),
		resolveResourceLocatorOptions: vi.fn(),
		listAttachableWorkflows: vi.fn(),
		...overrides,
	};
}

function createContext(service?: InstanceAiAgentBuilderService): InstanceAiContext {
	return {
		userId: 'user-1',
		agentBuilderService: service,
		agentBuilderTarget: service ? { agentId: 'agent-1', projectId: 'project-1' } : undefined,
		// nodeTypesProvider intentionally omitted → dynamic-selector check is skipped.
	} as unknown as InstanceAiContext;
}

describe('agent-builder config tools', () => {
	describe('read_config', () => {
		it('returns the snapshot with a configHash', async () => {
			const service = createService({
				getConfigSnapshot: vi
					.fn()
					.mockResolvedValue({ config: VALID_CONFIG, updatedAt: 't', versionId: 'v1' }),
			});
			const result = await executeTool(createReadConfigTool(createContext(service)), {}, {});
			expect(result).toEqual({
				ok: true,
				config: VALID_CONFIG,
				updatedAt: 't',
				versionId: 'v1',
				configHash: getAgentConfigHash(VALID_CONFIG),
			});
		});

		it('reports not-configured when the service is absent', async () => {
			const result = await executeTool<{ ok: boolean }>(
				createReadConfigTool(createContext()),
				{},
				{},
			);
			expect(result.ok).toBe(false);
		});
	});

	describe('write_config', () => {
		it('persists a valid config when there is no prior config', async () => {
			const updateConfig = vi
				.fn()
				.mockResolvedValue({ config: VALID_CONFIG, updatedAt: 't2', versionId: 'v2' });
			const service = createService({
				getConfigSnapshot: vi
					.fn()
					.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
				updateConfig,
			});

			const result = await executeTool<{ ok: boolean; configHash?: string }>(
				createWriteConfigTool(createContext(service)),
				{ json: JSON.stringify(VALID_CONFIG), baseConfigHash: null },
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

		it('rejects a stale baseConfigHash without persisting', async () => {
			const updateConfig = vi.fn();
			const service = createService({
				getConfigSnapshot: vi
					.fn()
					.mockResolvedValue({ config: VALID_CONFIG, updatedAt: 't', versionId: 'v1' }),
				updateConfig,
			});

			const result = await executeTool<{ ok: boolean; stage?: string }>(
				createWriteConfigTool(createContext(service)),
				{ json: JSON.stringify(VALID_CONFIG), baseConfigHash: 'stale-hash' },
				{},
			);

			expect(result).toMatchObject({ ok: false, stage: 'stale' });
			expect(updateConfig).not.toHaveBeenCalled();
		});

		it('rejects empty instructions', async () => {
			const updateConfig = vi.fn();
			const service = createService({
				getConfigSnapshot: vi
					.fn()
					.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
				updateConfig,
			});

			const result = await executeTool<{ ok: boolean; errors?: Array<{ path: string }> }>(
				createWriteConfigTool(createContext(service)),
				{ json: JSON.stringify({ ...VALID_CONFIG, instructions: '   ' }), baseConfigHash: null },
				{},
			);

			expect(result.ok).toBe(false);
			expect(result.errors?.some((e) => e.path === '/instructions')).toBe(true);
			expect(updateConfig).not.toHaveBeenCalled();
		});

		it('rejects invalid JSON', async () => {
			const service = createService({
				getConfigSnapshot: vi
					.fn()
					.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
			});
			const result = await executeTool<{ ok: boolean }>(
				createWriteConfigTool(createContext(service)),
				{ json: '{ not json', baseConfigHash: null },
				{},
			);
			expect(result.ok).toBe(false);
		});
	});

	describe('patch_config', () => {
		it('applies a replace operation and persists the patched config', async () => {
			const patchedConfig: AgentJsonConfig = {
				...VALID_CONFIG,
				instructions: 'Updated instructions.',
			};
			const updateConfig = vi
				.fn()
				.mockResolvedValue({ config: patchedConfig, updatedAt: 't3', versionId: 'v3' });
			const service = createService({
				getConfigSnapshot: vi
					.fn()
					.mockResolvedValue({ config: VALID_CONFIG, updatedAt: 't', versionId: 'v1' }),
				updateConfig,
			});

			const result = await executeTool<{ ok: boolean }>(
				createPatchConfigTool(createContext(service)),
				{
					operations: JSON.stringify([
						{ op: 'replace', path: '/instructions', value: 'Updated instructions.' },
					]),
					baseConfigHash: getAgentConfigHash(VALID_CONFIG),
				},
				{},
			);

			expect(result.ok).toBe(true);
			expect(updateConfig).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				expect.objectContaining({ instructions: 'Updated instructions.' }),
			);
		});

		it('rejects a stale baseConfigHash', async () => {
			const updateConfig = vi.fn();
			const service = createService({
				getConfigSnapshot: vi
					.fn()
					.mockResolvedValue({ config: VALID_CONFIG, updatedAt: 't', versionId: 'v1' }),
				updateConfig,
			});

			const result = await executeTool<{ ok: boolean; stage?: string }>(
				createPatchConfigTool(createContext(service)),
				{
					operations: JSON.stringify([{ op: 'replace', path: '/instructions', value: 'x' }]),
					baseConfigHash: 'stale',
				},
				{},
			);

			expect(result).toMatchObject({ ok: false, stage: 'stale' });
			expect(updateConfig).not.toHaveBeenCalled();
		});
	});
});
