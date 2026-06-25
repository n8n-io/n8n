/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
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
				agentFiles: [],
				agentFilesLoading: false,
				agentFilesUploading: false,
				knowledgeBaseEnabled: true,
				appliedSkills: [],
				connectedTriggers: [],
				isBuildChatStreaming: false,
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
					N8nRadioButtons: { template: '<div />' },
					N8nScrollArea: { template: '<div><slot /></div>' },
					N8nSelect: { template: '<div><slot /></div>', props: ['modelValue', 'disabled'] },
					N8nSwitch2: { template: '<button />', props: ['modelValue', 'disabled'] },
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
				agentFiles: [],
				agentFilesLoading: false,
				agentFilesUploading: false,
				knowledgeBaseEnabled: true,
				appliedSkills: [],
				connectedTriggers: [],
				isBuildChatStreaming: false,
				canEditAgent: false,
				executionsDescription: '',
			},
			global: {
				plugins: [createTestingPinia({ createSpy: vi.fn })],
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

	it('does not auto-send a seeded initialMessage when the build chat is read-only', async () => {
		const sendMessage = vi.fn();
		const loadHistory = vi.fn();
		// Reset module cache so the doMock below replaces the stream mock set up
		// by the earlier test in this describe block — without this, the cached
		// AgentChatPanel.vue would keep using the previous mock and our
		// `loadHistory` assertion would observe zero calls on the wrong fn.
		vi.resetModules();
		vi.doMock('../composables/useAgentChatStream', () => ({
			useAgentChatStream: () => ({
				messages: ref([]),
				isStreaming: ref(false),
				messagingState: ref('idle'),
				fatalError: ref(null),
				loadHistory,
				sendMessage,
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

		const beforeSend = vi.fn();
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
				initialMessage: 'seed build prompt',
				beforeSend,
			},
			global: {
				stubs: {
					N8nButton: { template: '<button><slot /></button>' },
					N8nCallout: { template: '<div><slot /></div>' },
					N8nIconButton: { template: '<button />' },
					AgentChatEmptyState: { template: '<div data-testid="stub-empty-state" />' },
					AgentChatMessageList: { template: '<div />' },
					ChatInputBase: {
						name: 'ChatInputBase',
						template: '<div data-testid="stub-chat-input" />',
						props: ['modelValue', 'placeholder', 'isStreaming', 'canSubmit', 'disabled'],
					},
				},
			},
		});

		await vi.waitFor(() => {
			// Setup-time auto-send has run if it was going to.
			expect(wrapper.exists()).toBe(true);
		});

		expect(sendMessage).not.toHaveBeenCalled();
		expect(beforeSend).not.toHaveBeenCalled();
		expect(wrapper.emitted('initial-consumed')).toBeUndefined();
		// History is loaded instead of auto-sending — so any existing thread
		// renders rather than showing a misleading "build your agent" empty state.
		expect(loadHistory).toHaveBeenCalledTimes(1);
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
