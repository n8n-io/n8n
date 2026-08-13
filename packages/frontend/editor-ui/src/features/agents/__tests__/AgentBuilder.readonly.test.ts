/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
	i18n: { baseText: (key: string) => key },
}));

vi.mock('../composables/useProjectAgentsList', () => ({
	useProjectAgentsList: () => ({
		list: { value: [] },
		ensureLoaded: vi.fn().mockResolvedValue([]),
	}),
}));

// First mount of these SFCs eats the Vite transform cost; give them headroom.
vi.setConfig({ testTimeout: 30_000 });

describe('AgentBuilderEditorColumn — childrenDisabled composes streaming and canEditAgent', () => {
	it('Agent tab child panels see disabled=true when canEditAgent is false', async () => {
		const { default: AgentBuilderEditorColumn } = await import(
			'../components/AgentBuilderEditorColumn.vue'
		);

		const wrapper = mount(AgentBuilderEditorColumn, {
			props: {
				activeMainTab: 'agent',
				mainTabOptions: [
					{ label: 'Agent', value: 'agent' },
					{ label: 'Sessions', value: 'sessions' },
					{ label: 'Settings', value: 'settings' },
				],
				localConfig: {} as never,
				agent: null,
				projectId: 'p1',
				agentId: 'a1',
				agentFiles: [],
				agentFilesLoading: false,
				agentFilesUploading: false,
				knowledgeBaseEnabled: true,
				appliedSkills: [],
				connectedTriggers: [],
				canEditAgent: false, // <<< Agent is read only
				executionsDescription: '',
			},
			global: {
				plugins: [createTestingPinia({ createSpy: vi.fn })],
				stubs: {
					N8nCard: { template: '<div><slot /></div>' },
					N8nHeading: { template: '<div><slot /></div>' },
					N8nButton: { template: '<button><slot /><slot name="icon" /></button>' },
					N8nIcon: { template: '<span />', props: ['icon', 'size'] },
					N8nIconButton: { template: '<button />' },
					N8nOption: { template: '<div />', props: ['value', 'label', 'disabled'] },
					N8nScrollArea: { template: '<div><slot /></div>' },
					N8nSelect: { template: '<div><slot /></div>', props: ['modelValue', 'disabled'] },
					N8nSwitch2: { template: '<button />', props: ['modelValue', 'disabled'] },
					N8nTabs: { template: '<div />', props: ['modelValue', 'options'] },
					N8nText: { template: '<span><slot /></span>' },
					N8nTooltip: { template: '<div><slot /></div>' },
					AgentIdentityHeader: {
						name: 'AgentIdentityHeader',
						template: '<div data-testid="stub-identity" />',
						props: ['config', 'disabled'],
					},
					AgentInfoPanel: {
						name: 'AgentInfoPanel',
						template: '<div data-testid="stub-info" />',
						props: ['config', 'disabled', 'embedded'],
					},
					AgentMemoryPanel: {
						name: 'AgentMemoryPanel',
						template: '<div data-testid="stub-memory" />',
						props: ['config', 'disabled', 'embedded'],
					},
					AgentFilesPanel: {
						name: 'AgentFilesPanel',
						template: '<div data-testid="stub-files" />',
						props: ['files', 'disabled', 'loading', 'uploading'],
					},
					AgentAdvancedPanel: {
						name: 'AgentAdvancedPanel',
						template: '<div data-testid="stub-advanced" />',
						props: ['config', 'disabled', 'collapsible'],
					},
					AgentCapabilitiesSection: {
						name: 'AgentCapabilitiesSection',
						template: '<div data-testid="stub-capabilities" />',
						props: [
							'config',
							'tools',
							'customTools',
							'skills',
							'connectedTriggers',
							'disabled',
							'projectId',
							'agentId',
							'isPublished',
							'taskRefs',
							'reloadKey',
						],
					},
					AgentSessionsListView: { template: '<div />' },
					AgentPanelHeader: { template: '<div />', props: ['title', 'description'] },
				},
			},
		});

		expect(wrapper.findComponent({ name: 'AgentIdentityHeader' }).props('disabled')).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentInfoPanel' }).props('disabled')).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).props('disabled')).toBe(
			true,
		);
		expect(wrapper.findComponent({ name: 'AgentMemoryPanel' }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: 'AgentAdvancedPanel' }).exists()).toBe(false);
	});

	it('Settings tab child panels see disabled=true when canEditAgent is false', async () => {
		const { default: AgentBuilderEditorColumn } = await import(
			'../components/AgentBuilderEditorColumn.vue'
		);

		const wrapper = mount(AgentBuilderEditorColumn, {
			props: {
				activeMainTab: 'settings',
				mainTabOptions: [
					{ label: 'Agent', value: 'agent' },
					{ label: 'Sessions', value: 'sessions' },
					{ label: 'Settings', value: 'settings' },
				],
				localConfig: {} as never,
				agent: null,
				projectId: 'p1',
				agentId: 'a1',
				agentFiles: [],
				agentFilesLoading: false,
				agentFilesUploading: false,
				knowledgeBaseEnabled: true,
				appliedSkills: [],
				connectedTriggers: [],
				canEditAgent: false,
				executionsDescription: '',
			},
			global: {
				plugins: [createTestingPinia({ createSpy: vi.fn })],
				stubs: {
					N8nCard: { template: '<div><slot /></div>' },
					N8nHeading: { template: '<div><slot /></div>' },
					N8nIcon: { template: '<span />', props: ['icon', 'size'] },
					N8nIconButton: { template: '<button />' },
					N8nOption: { template: '<div />', props: ['value', 'label', 'disabled'] },
					N8nScrollArea: { template: '<div><slot /></div>' },
					N8nSelect: { template: '<div><slot /></div>', props: ['modelValue', 'disabled'] },
					N8nSwitch2: { template: '<button />', props: ['modelValue', 'disabled'] },
					N8nTabs: { template: '<div />', props: ['modelValue', 'options'] },
					N8nText: { template: '<span><slot /></span>' },
					N8nTooltip: { template: '<div><slot /></div>' },
					AgentSubAgentsPanel: {
						name: 'AgentSubAgentsPanel',
						template: '<div data-testid="stub-sub-agents" />',
						props: ['config', 'disabled', 'projectId', 'agentId'],
					},
					AgentMemoryPanel: {
						name: 'AgentMemoryPanel',
						template: '<div data-testid="stub-memory" />',
						props: ['config', 'disabled', 'embedded'],
					},
					AgentAdvancedPanel: {
						name: 'AgentAdvancedPanel',
						template: '<div data-testid="stub-advanced" />',
						props: ['config', 'disabled', 'collapsible'],
					},
					AgentPanelHeader: { template: '<div />', props: ['title', 'description'] },
				},
			},
		});

		expect(wrapper.findComponent({ name: 'AgentSubAgentsPanel' }).props('disabled')).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentMemoryPanel' }).props('disabled')).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentAdvancedPanel' }).props('disabled')).toBe(true);
	});
});
