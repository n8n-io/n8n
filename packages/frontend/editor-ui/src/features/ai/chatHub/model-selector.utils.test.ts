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

		const resultWithCustomAgents = buildModelSelectorMenuItems(agents, buildMenuOptions);
		const resultWithNoCustomAgents = buildModelSelectorMenuItems(agents, {
			...buildMenuOptions,
			includeCustomAgents: false,
		});
		const expectedShapeWithCustomAgents = expect.arrayContaining([
			expect.objectContaining({ label: 'chatHub.agent.workflowAgents' }),
			expect.objectContaining({ label: 'chatHub.agent.personalAgents' }),
		]);

		expect(resultWithCustomAgents).toEqual(expectedShapeWithCustomAgents);
		expect(resultWithNoCustomAgents).not.toEqual(expectedShapeWithCustomAgents);
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

		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: 'chatHub.agent.workflowAgents',
					children: expect.arrayContaining([
						expect.objectContaining({
							label: 'Project A',
							children: expect.arrayContaining([expect.objectContaining({ label: 'Agent 1' })]),
						}),
						expect.objectContaining({
							label: 'Project B',
							children: expect.arrayContaining([expect.objectContaining({ label: 'Agent 2' })]),
						}),
					]),
				}),
			]),
		);
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

		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: 'chatHub.agent.workflowAgents',
					children: expect.arrayContaining([
						expect.objectContaining({ label: 'Agent 1' }),
						expect.objectContaining({ label: 'Agent 2' }),
					]),
				}),
			]),
		);
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

		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: 'chatHub.agent.personalAgents',
					children: expect.arrayContaining([
						expect.objectContaining({ label: 'My Personal Agent' }),
						expect.objectContaining({ label: 'chatHub.agent.newAgent' }),
					]),
				}),
			]),
		);
	});

	it('should include LLM provider models with "configure" and "add" menu', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
		});

		const result = buildModelSelectorMenuItems(agents, buildMenuOptions);

		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: 'OpenAI',
					children: expect.arrayContaining([
						expect.objectContaining({ label: 'chatHub.agent.configureCredentials' }),
						expect.objectContaining({ label: 'GPT-4' }),
						expect.objectContaining({ label: 'chatHub.agent.addModel' }),
					]),
				}),
			]),
		);
	});

	it('should add divided property to first LLM provider', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
			anthropic: { models: [mockAnthropicModel] },
		});

		const result = buildModelSelectorMenuItems(agents, buildMenuOptions);

		expect(result).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: 'openai', divided: true })]),
		);
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

		expect(result).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'openai' })]));
	});

	it('should show loading state', () => {
		const agents = createMockModelsResponse();

		const result = buildModelSelectorMenuItems(agents, {
			...buildMenuOptions,
			isLoading: true,
		});

		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: 'chatHub.agent.personalAgents',
					children: expect.arrayContaining([
						expect.objectContaining({
							id: 'custom-agent::loading',
							label: 'generic.loadingEllipsis',
							disabled: true,
						}),
					]),
				}),
			]),
		);
	});

	it('should show empty state for workflow agents', () => {
		const agents = createMockModelsResponse({ n8n: { models: [] } });

		const result = buildModelSelectorMenuItems(agents, buildMenuOptions);

		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: 'chatHub.agent.workflowAgents',
					children: [
						expect.objectContaining({
							id: 'n8n::no-agents',
							label: 'chatHub.workflowAgents.empty.noAgents',
							disabled: true,
						}),
					],
				}),
			]),
		);
	});
});

describe(applySearch, () => {
	it('should return all items when query is empty', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
			anthropic: { models: [mockAnthropicModel] },
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);

		expect(applySearch(menuItems, '')).toEqual(menuItems);
	});

	it('should filter items by label', () => {
		const agents = createMockModelsResponse({
			openai: { models: [mockOpenAiModel] },
			anthropic: { models: [mockAnthropicModel] },
		});

		const menuItems = buildModelSelectorMenuItems(agents, buildMenuOptions);

		expect(applySearch(menuItems, 'gpt')).toEqual([
			expect.objectContaining({
				label: 'GPT-4',
				data: expect.objectContaining({ parts: ['OpenAI', 'GPT-4'] }),
			}),
		]);
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

		expect(applySearch(menuItems, 'agent')).toEqual([
			expect.objectContaining({
				label: 'Agent 1',
				data: expect.objectContaining({
					parts: ['chatHub.agent.workflowAgents', 'ProjectA', 'Agent 1'],
				}),
			}),
			expect.objectContaining({
				label: 'Agent 2',
				data: expect.objectContaining({
					parts: ['chatHub.agent.workflowAgents', 'ProjectB', 'Agent 2'],
				}),
			}),
			expect.objectContaining({
				label: 'Agent 3',
				data: expect.objectContaining({
					parts: ['chatHub.agent.workflowAgents', 'ProjectB', 'Agent 3'],
				}),
			}),
		]);
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

		expect(applySearch(menuItems, 'agent')).toEqual([
			expect.objectContaining({
				label: 'My Agent',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'My Agent'] }),
			}),
			expect.objectContaining({
				label: 'Another Agent',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Another Agent'] }),
			}),
		]);
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

		expect(applySearch(menuItems, 'agent')).toEqual([
			expect.objectContaining({
				label: 'Agent 0',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 0'] }),
			}),
			expect.objectContaining({
				label: 'Agent 1',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 1'] }),
			}),
			expect.objectContaining({
				label: 'Agent 2',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 2'] }),
			}),
			expect.objectContaining({
				label: 'Agent 3',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 3'] }),
			}),
			expect.objectContaining({
				label: 'Agent 4',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 4'] }),
			}),
			expect.objectContaining({
				label: 'Agent 5',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 5'] }),
			}),
			expect.objectContaining({
				label: 'Agent 6',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 6'] }),
			}),
			expect.objectContaining({
				label: 'Agent 7',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 7'] }),
			}),
			expect.objectContaining({
				label: 'Agent 8',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 8'] }),
			}),
			expect.objectContaining({
				label: 'Agent 9',
				data: expect.objectContaining({ parts: ['chatHub.agent.workflowAgents', 'Agent 9'] }),
			}),
			expect.objectContaining({
				label: 'More Workflow agent models...',
				children: [
					expect.objectContaining({ label: 'Agent 10' }),
					expect.objectContaining({ label: 'Agent 11' }),
				],
			}),
		]);
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

		expect(applySearch(menuItems, 'add')).toEqual([]);
		expect(applySearch(menuItems, 'verify')).toEqual([]);
		expect(applySearch(menuItems, 'configure')).toEqual([]);
		expect(applySearch(loadingMenuItems, 'loading')).toEqual([]);
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

		expect(applySearch(menuItems, 'gpt')).toEqual([
			expect.objectContaining({
				label: 'GPT-4',
				data: expect.objectContaining({ parts: ['OpenAI', 'GPT-4'] }),
			}),
			expect.objectContaining({
				label: 'GPT-3.5 Turbo',
				data: expect.objectContaining({ parts: ['OpenAI', 'GPT-3.5 Turbo'] }),
			}),
		]);
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

		expect(applySearch(menuItems, 'anthropic')).toEqual([]);
	});
});
