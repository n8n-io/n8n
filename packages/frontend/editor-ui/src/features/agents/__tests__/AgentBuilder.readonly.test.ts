/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
	i18n: { baseText: (key: string) => key },
}));

// First mount of these SFCs eats the Vite transform cost; give them headroom.
vi.setConfig({ testTimeout: 30_000 });

describe('AgentBuilderEditorColumn — childrenDisabled composes streaming and canEditAgent', () => {
	it('child panels see disabled=true when canEditAgent is false', async () => {
		const { default: AgentBuilderEditorColumn } = await import(
			'../components/AgentBuilderEditorColumn.vue'
		);

		const wrapper = mount(AgentBuilderEditorColumn, {
			props: {
				activeMainTab: 'agent',
				mainTabOptions: [{ label: 'Agent', value: 'agent' }],
				localConfig: {} as never,
				agent: null,
				projectId: 'p1',
				agentId: 'a1',
				appliedSkills: [],
				connectedTriggers: [],
				isBuildChatStreaming: false,
				canEditAgent: false, // <<< Agent is read only
				executionsDescription: '',
			},
			global: {
				stubs: {
					N8nCard: { template: '<div><slot /></div>' },
					N8nHeading: { template: '<div><slot /></div>' },
					N8nRadioButtons: { template: '<div />' },
					N8nText: { template: '<span><slot /></span>' },
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
						],
					},
					AgentJsonEditor: {
						name: 'AgentJsonEditor',
						template: '<div data-testid="stub-json" />',
						props: ['value', 'readOnly', 'copyButtonTestId'],
					},
					AgentSessionsListView: { template: '<div />' },
					AgentPanelHeader: { template: '<div />', props: ['title', 'description'] },
				},
			},
		});

		expect(wrapper.findComponent({ name: 'AgentIdentityHeader' }).props('disabled')).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentInfoPanel' }).props('disabled')).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentMemoryPanel' }).props('disabled')).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentAdvancedPanel' }).props('disabled')).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).props('disabled')).toBe(
			true,
		);
	});

	it('JSON editor receives readOnly=true when canEditAgent is false', async () => {
		const { default: AgentBuilderEditorColumn } = await import(
			'../components/AgentBuilderEditorColumn.vue'
		);

		const wrapper = mount(AgentBuilderEditorColumn, {
			props: {
				activeMainTab: 'raw',
				mainTabOptions: [{ label: 'Raw', value: 'raw' }],
				localConfig: {} as never,
				agent: null,
				projectId: 'p1',
				agentId: 'a1',
				appliedSkills: [],
				connectedTriggers: [],
				isBuildChatStreaming: false,
				canEditAgent: false,
				executionsDescription: '',
			},
			global: {
				stubs: {
					N8nCard: { template: '<div><slot /></div>' },
					N8nHeading: { template: '<div><slot /></div>' },
					N8nRadioButtons: { template: '<div />' },
					N8nText: { template: '<span><slot /></span>' },
					AgentJsonEditor: {
						name: 'AgentJsonEditor',
						template: '<div data-testid="stub-json" />',
						props: ['value', 'readOnly', 'copyButtonTestId'],
					},
					AgentPanelHeader: { template: '<div />', props: ['title', 'description'] },
				},
			},
		});

		expect(wrapper.findComponent({ name: 'AgentJsonEditor' }).props('readOnly')).toBe(true);
	});
});

describe('AgentChatPanel — read-only build chat input', () => {
	it('disables ChatInputBase when endpoint=build and canEditAgent=false', async () => {
		vi.doMock('../composables/useAgentChatStream', () => ({
			useAgentChatStream: () => ({
				messages: ref([]),
				isStreaming: ref(false),
				messagingState: ref('idle'),
				fatalError: ref(null),
				loadHistory: vi.fn(),
				sendMessage: vi.fn(),
				stopGenerating: vi.fn(),
				resume: vi.fn(),
				dismissFatalError: vi.fn(),
			}),
		}));
		vi.doMock('../composables/useAgentTelemetry', () => ({
			useAgentTelemetry: () => ({ trackSubmittedMessage: vi.fn() }),
		}));
		vi.doMock('../composables/agentTelemetry.utils', () => ({
			buildAgentConfigFingerprint: vi.fn().mockResolvedValue({}),
		}));

		const { default: AgentChatPanel } = await import('../components/AgentChatPanel.vue');

		const wrapper = mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
				endpoint: 'build',
				agentConfig: null,
				agentStatus: 'draft',
				connectedTriggers: [],
				canEditAgent: false,
			},
			global: {
				stubs: {
					N8nButton: { template: '<button><slot /></button>' },
					N8nCallout: { template: '<div><slot /></div>' },
					N8nIconButton: { template: '<button />' },
					AgentChatEmptyState: { template: '<div />' },
					AgentChatMessageList: { template: '<div />' },
					ChatInputBase: {
						name: 'ChatInputBase',
						template: '<div data-testid="stub-chat-input" />',
						props: ['modelValue', 'placeholder', 'isStreaming', 'canSubmit', 'disabled'],
					},
				},
			},
		});

		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });
		expect(chatInput.props('disabled')).toBe(true);
		expect(chatInput.props('canSubmit')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('agents.builder.readonly.placeholder');
	});

	it('does not disable ChatInputBase for endpoint=chat (test mode) regardless of canEditAgent', async () => {
		const { default: AgentChatPanel } = await import('../components/AgentChatPanel.vue');

		const wrapper = mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
				endpoint: 'chat',
				agentConfig: null,
				agentStatus: 'production',
				connectedTriggers: [],
				canEditAgent: false,
			},
			global: {
				stubs: {
					N8nButton: { template: '<button><slot /></button>' },
					N8nCallout: { template: '<div><slot /></div>' },
					N8nIconButton: { template: '<button />' },
					AgentChatEmptyState: { template: '<div />' },
					AgentChatMessageList: { template: '<div />' },
					ChatInputBase: {
						name: 'ChatInputBase',
						template: '<div data-testid="stub-chat-input" />',
						props: ['modelValue', 'placeholder', 'isStreaming', 'canSubmit', 'disabled'],
					},
				},
			},
		});

		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });
		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('agents.chat.input.placeholder');
	});
});
