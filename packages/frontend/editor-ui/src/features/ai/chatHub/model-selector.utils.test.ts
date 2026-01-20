import { describe, it, expect } from 'vitest';
import type { I18nClass } from '@n8n/i18n';
import {
	createMockAgent,
	createMockModelsResponse,
	createChatHubModuleSettings,
} from './__test__/data';
import {
	applySearch,
	buildModelSelectorMenuItems,
	type BuildMenuItemsOptions,
} from './model-selector.utils';

// Identity function - baseText just returns the key as-is
const createMockI18n = (): I18nClass => {
	return {
		baseText: (key: string) => key,
	} as I18nClass;
};

const mockI18n = createMockI18n();
const mockSettings = createChatHubModuleSettings();

const mockN8nAgent = createMockAgent({
	name: 'Workflow Agent',
	model: { provider: 'n8n', workflowId: 'wf-123' },
	groupName: 'Project A',
});

const mockPersonalAgent = createMockAgent({
	name: 'Personal Agent',
	model: { provider: 'custom-agent', agentId: 'agent-123' },
});

const mockOpenAiModel = createMockAgent({
	name: 'GPT-4',
	model: { provider: 'openai', model: 'gpt-4' },
});

const mockAnthropicModel = createMockAgent({
	name: 'Claude',
	model: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
});

const buildMenuOptions: BuildMenuItemsOptions = {
	includeCustomAgents: true,
	isLoading: false,
	i18n: mockI18n,
	settings: mockSettings.providers,
};

describe(buildModelSelectorMenuItems, () => {
	it('should include n8n agents only when includeCustomAgents is true', () => {
		const agents = createMockModelsResponse({
			n8n: { models: [mockN8nAgent] },
			'custom-agent': { models: [mockPersonalAgent] },
		});

		const result1 = buildModelSelectorMenuItems(agents, buildMenuOptions);
		const result2 = buildModelSelectorMenuItems(agents, {
			...buildMenuOptions,
			includeCustomAgents: false,
		});

		expect(result1.some(({ label }) => label === 'chatHub.agent.personalAgents')).toBeTruthy();
		expect(result1.some(({ label }) => label === 'chatHub.agent.workflowAgents')).toBeTruthy();
		expect(result2.some(({ label }) => label === 'chatHub.agent.personalAgents')).not.toBeTruthy();
		expect(result2.some(({ label }) => label === 'chatHub.agent.workflowAgents')).not.toBeTruthy();
	});

	it('should group workflow agents by project when multiple projects exist', () => {
		const agent1 = createMockAgent({
			name: 'Agent 1',
			model: { provider: 'n8n', workflowId: 'wf-1' },
			groupName: 'Project A',
			groupIcon: { type: 'emoji', value: '🚀' },
		});

		const agent2 = createMockAgent({
			name: 'Agent 2',
			model: { provider: 'n8n', workflowId: 'wf-2' },
			groupName: 'Project B',
			groupIcon: { type: 'emoji', value: '🎯' },
		});

		const agents = createMockModelsResponse({
			n8n: { models: [agent1, agent2] },
		});

		const result = buildModelSelectorMenuItems(agents, buildMenuOptions);

		const workflowAgentsGroup = result.find(
			(item) => item.label === 'chatHub.agent.workflowAgents',
		);
		expect(workflowAgentsGroup).toBeDefined();
		expect(workflowAgentsGroup?.children).toHaveLength(2);

		const projectA = workflowAgentsGroup?.children?.find((item) => item.label === 'Project A');
		expect(projectA).toBeDefined();
		expect(projectA?.children).toHaveLength(1);
		expect(projectA?.children?.[0].label).toBe('Agent 1');

		const projectB = workflowAgentsGroup?.children?.find((item) => item.label === 'Project B');
		expect(projectB).toBeDefined();
		expect(projectB?.children).toHaveLength(1);
		expect(projectB?.children?.[0].label).toBe('Agent 2');
	});

	it('should not group n8n agents when only one project exists', () => {
		const agent1 = createMockAgent({
			name: 'Agent 1',
			model: { provider: 'n8n', workflowId: 'wf-1' },
			groupName: 'Project A',
		});

		const agent2 = createMockAgent({
			name: 'Agent 2',
			model: { provider: 'n8n', workflowId: 'wf-2' },
			groupName: 'Project A',
		});

		const agents = createMockModelsResponse({
			n8n: { models: [agent1, agent2] },
		});

		const result = buildModelSelectorMenuItems(agents, buildMenuOptions);

		const workflowAgentsGroup = result.find(
			(item) => item.label === 'chatHub.agent.workflowAgents',
		);
		expect(workflowAgentsGroup).toBeDefined();
		expect(workflowAgentsGroup?.children).toHaveLength(2);
		expect(workflowAgentsGroup?.children?.[0].label).toBe('Agent 1');
		expect(workflowAgentsGroup?.children?.[1].label).toBe('Agent 2');
	});

	it('should include personal agents with "add" menu', () => {
		const personalAgent = createMockAgent({
			name: 'My Personal Agent',
			model: { provider: 'custom-agent', agentId: 'agent-123' },
		});

		const agents = createMockModelsResponse({
			'custom-agent': { models: [personalAgent] },
		});

		const result = buildModelSelectorMenuItems(agents, buildMenuOptions);

		const personalAgentsGroup = result.find(
			(item) => item.label === 'chatHub.agent.personalAgents',
		);
		expect(personalAgentsGroup).toBeDefined();
		expect(personalAgentsGroup?.children).toHaveLength(2);
		expect(personalAgentsGroup?.children?.[0].label).toBe('My Personal Agent');
		expect(personalAgentsGroup?.children?.[1].label).toBe('chatHub.agent.newAgent');
	});

	it('should include LLM provider models with "configure" and "add" menu', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
		});

		const result = buildModelSelectorMenuItems(agents, buildMenuOptions);

		const openaiGroup = result.find((item) => item.label === 'OpenAI');
		expect(openaiGroup).toBeDefined();
		expect(openaiGroup?.children).toHaveLength(3);
		expect(openaiGroup?.children?.[0].label).toBe('chatHub.agent.configureCredentials');
		expect(openaiGroup?.children?.[1].label).toBe('GPT-4');
		expect(openaiGroup?.children?.[2].label).toBe('chatHub.agent.addModel');
	});

	it('should add divided property to first LLM provider', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
			anthropic: { models: [mockAnthropicModel] },
		});

		const result = buildModelSelectorMenuItems(agents, buildMenuOptions);

		const openaiGroup = result.find((item) => item.id === 'openai');
		expect(openaiGroup).toBeDefined();
		expect(openaiGroup?.divided).toBe(true);

		const anthropicGroup = result.find((item) => item.id === 'anthropic');
		expect(anthropicGroup).toBeDefined();
		expect(anthropicGroup?.divided).toBeUndefined();
	});

	it('should filter out disabled providers', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
		});

		const settings = createChatHubModuleSettings({
			providers: {
				...mockSettings.providers,
				openai: {
					...mockSettings.providers.openai,
					enabled: false,
				},
			},
		});

		const result = buildModelSelectorMenuItems(agents, {
			...buildMenuOptions,
			settings: settings.providers,
		});

		const openaiGroup = result.find((item) => item.id === 'openai');
		expect(openaiGroup).toBeUndefined();
	});

	it('should show loading state', () => {
		const agents = createMockModelsResponse();

		const result = buildModelSelectorMenuItems(agents, {
			...buildMenuOptions,
			isLoading: true,
		});

		const personalAgentsGroup = result.find(
			(item) => item.label === 'chatHub.agent.personalAgents',
		);
		expect(personalAgentsGroup).toBeDefined();
		expect(personalAgentsGroup?.children).toHaveLength(2);
		expect(personalAgentsGroup?.children?.[0].id).toBe('custom-agent::loading');
		expect(personalAgentsGroup?.children?.[0].label).toBe('generic.loadingEllipsis');
		expect(personalAgentsGroup?.children?.[0].disabled).toBe(true);
		expect(personalAgentsGroup?.children?.[1].label).toBe('chatHub.agent.newAgent');
	});

	it('should show empty state for workflow agents', () => {
		const agents = createMockModelsResponse({ n8n: { models: [] } });

		const result = buildModelSelectorMenuItems(agents, buildMenuOptions);

		const workflowAgentsGroup = result.find(
			(item) => item.label === 'chatHub.agent.workflowAgents',
		);
		expect(workflowAgentsGroup).toBeDefined();
		expect(workflowAgentsGroup?.children).toHaveLength(1);
		expect(workflowAgentsGroup?.children?.[0].id).toBe('n8n::no-agents');
		expect(workflowAgentsGroup?.children?.[0].label).toBe('chatHub.workflowAgents.empty.noAgents');
		expect(workflowAgentsGroup?.children?.[0].disabled).toBe(true);
	});
});

describe(applySearch, () => {
	it('should return all items when query is empty', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
			anthropic: { models: [mockAnthropicModel] },
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);

		expect(applySearch(menuItems, '', mockI18n)).toEqual(menuItems);
	});

	it('should filter items by label', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
			anthropic: { models: [mockAnthropicModel] },
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);
		const result = applySearch(menuItems, 'gpt', mockI18n);

		expect(result).toHaveLength(1);
		expect(result[0].label).toBe('GPT-4');
		expect(result[0].data?.parts).toEqual(['OpenAI', 'GPT-4']);
	});

	it('should flatten nested groups in search results for n8n agents with project groups', () => {
		// Create agents from different projects
		const agent1 = createMockAgent({
			name: 'Agent 1',
			model: { provider: 'n8n', workflowId: 'wf-1' },
			groupName: 'ProjectA',
		});

		const agent2 = createMockAgent({
			name: 'Agent 2',
			model: { provider: 'n8n', workflowId: 'wf-2' },
			groupName: 'ProjectB',
		});

		const agent3 = createMockAgent({
			name: 'Agent 3',
			model: { provider: 'n8n', workflowId: 'wf-3' },
			groupName: 'ProjectB',
		});

		const agents = createMockModelsResponse({
			n8n: { models: [agent1, agent2, agent3] },
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);
		const result = applySearch(menuItems, 'agent', mockI18n);

		expect(result).toHaveLength(3);
		expect(result[0].label).toBe('Agent 1');
		expect(result[0].data?.parts).toEqual(['chatHub.agent.workflowAgents', 'ProjectA', 'Agent 1']);
		expect(result[1].label).toBe('Agent 2');
		expect(result[1].data?.parts).toEqual(['chatHub.agent.workflowAgents', 'ProjectB', 'Agent 2']);
		expect(result[2].label).toBe('Agent 3');
		expect(result[2].data?.parts).toEqual(['chatHub.agent.workflowAgents', 'ProjectB', 'Agent 3']);
	});

	it('should not group workflow agents if all matched agents belong to the same group', () => {
		const agent1 = createMockAgent({
			name: 'My Agent',
			model: { provider: 'n8n', workflowId: 'wf-1' },
			groupName: 'g',
		});
		const agent2 = createMockAgent({
			name: 'Another Agent',
			model: { provider: 'n8n', workflowId: 'wf-2' },
			groupName: 'g',
		});

		const agents = createMockModelsResponse({
			n8n: { models: [agent1, agent2] },
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);
		const result = applySearch(menuItems, 'agent', mockI18n);

		expect(result).toHaveLength(2);
		expect(result[0].label).toBe('My Agent');
		expect(result[0].data?.parts).toEqual(['chatHub.agent.workflowAgents', 'My Agent']);
		expect(result[1].label).toBe('Another Agent');
		expect(result[1].data?.parts).toEqual(['chatHub.agent.workflowAgents', 'Another Agent']);
	});

	it('should limit flattened results and show "More" item when exceeding limit', () => {
		const agentModels = Array.from({ length: 12 }, (_, i) =>
			createMockAgent({
				name: `Agent ${i}`,
				model: { provider: 'n8n', workflowId: `wf-${i}` },
			}),
		);

		const agents = createMockModelsResponse({
			n8n: { models: agentModels },
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);
		const result = applySearch(menuItems, 'agent', mockI18n);

		expect(result).toHaveLength(11);
		for (let i = 0; i < 10; i++) {
			expect(result[i].label).toBe(`Agent ${i}`);
			expect(result[i].data?.parts).toEqual(['chatHub.agent.workflowAgents', `Agent ${i}`]);
		}

		expect(result[10].label).toBe('chatHub.models.selector.moreModels');
		expect(result[10].children).toHaveLength(2);
		expect(result[10].children?.[0].label).toBe('Agent 10');
		expect(result[10].children?.[1].label).toBe('Agent 11');
	});

	it('should not match non-model menu items', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
			anthropic: { models: [], error: 'Could not retrieve models. Verify credentials.' },
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);

		const loadingMenuItems = buildModelSelectorMenuItems(agents, {
			...buildMenuOptions,
			isLoading: true,
		});

		expect(applySearch(menuItems, 'add', mockI18n)).toEqual([]);
		expect(applySearch(menuItems, 'verify', mockI18n)).toEqual([]);
		expect(applySearch(menuItems, 'configure', mockI18n)).toEqual([]);
		expect(applySearch(loadingMenuItems, 'loading', mockI18n)).toEqual([]);
	});

	it('should only include providers with at least one matched models', () => {
		const gpt35Model = createMockAgent({
			name: 'GPT-3.5 Turbo',
			model: { provider: 'openai', model: 'gpt-3.5-turbo' },
		});

		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel, gpt35Model] },
			anthropic: { models: [mockAnthropicModel] },
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);
		const result = applySearch(menuItems, 'gpt', mockI18n);

		expect(result).toHaveLength(2);
		expect(result[0].label).toBe('GPT-4');
		expect(result[0].data?.parts).toEqual(['OpenAI', 'GPT-4']);
		expect(result[1].label).toBe('GPT-3.5 Turbo');
		expect(result[1].data?.parts).toEqual(['OpenAI', 'GPT-3.5 Turbo']);
	});

	it('should not include providers with only special menu items', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
			anthropic: {
				models: [],
				error: 'Could not retrieve models. Verify credentials.',
			},
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);

		expect(applySearch(menuItems, 'anthropic', mockI18n)).toEqual([]);
	});
});
