/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import type { PushMessage } from '@n8n/api-types';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import userEvent from '@testing-library/user-event';
import { cleanup, render, screen, waitFor } from '@testing-library/vue';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import AgentPreviewMoreMenu from '../components/AgentPreviewMoreMenu.vue';
import type { AgentExecution, ThreadDetail } from '../composables/useAgentThreadsApi';

enableAutoUnmount(afterEach);
afterEach(cleanup);

const { clipboardCopy, getThreadDetail, routerResolve, showError, showMessage } = vi.hoisted(
	function createMocks() {
		return {
			clipboardCopy: vi.fn(),
			getThreadDetail: vi.fn<(...args: string[]) => Promise<ThreadDetail>>(),
			routerResolve: vi.fn(function resolveRoute() {
				return { href: '/resolved-preview' };
			}),
			showError: vi.fn(),
			showMessage: vi.fn(),
		};
	},
);

const pushListeners = new Set<(event: PushMessage) => void>();
vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		addEventListener: (listener: (event: PushMessage) => void) => {
			pushListeners.add(listener);
			return () => pushListeners.delete(listener);
		},
	}),
}));
const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'session-xyz' }),
}));

const editorContext = { agent_id: 'agent-1', push_ref: 'session-xyz' };

vi.mock('@n8n/composables/useClipboard', function mockUseClipboard() {
	return {
		useClipboard: function useClipboard() {
			return { copy: clipboardCopy };
		},
	};
});

vi.mock('@n8n/composables/useToast', function mockUseToast() {
	return {
		useToast: function useToast() {
			return { showError, showMessage };
		},
	};
});

vi.mock('@n8n/i18n', function mockUseI18n() {
	return {
		useI18n: function useI18n() {
			return {
				baseText: function baseText(
					key: string,
					options?: { interpolate?: Record<string, string> },
				) {
					return options?.interpolate?.date ? `${key}:${options.interpolate.date}` : key;
				},
			};
		},
	};
});

vi.mock('vue-router', function mockVueRouter() {
	return {
		useRouter: function useRouter() {
			return { resolve: routerResolve };
		},
	};
});

vi.mock('../agentSessions.store', function mockAgentSessionsStore() {
	return {
		useAgentSessionsStore: function useAgentSessionsStore() {
			return { getThreadDetail };
		},
	};
});

const stubs = {
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		props: ['items'],
		emits: ['select', 'update:modelValue'],
		template: `
			<div>
				<slot name="trigger" />
				<div v-for="item in items" :key="item.id" :data-menu-item="item.id">
					<i v-if="item.icon" :data-icon="item.icon.value" />
					<span>{{ item.label }}</span>
					<slot name="item-trailing" :item="item" />
				</div>
				<slot name="footer" />
			</div>
		`,
	},
	N8nIcon: {
		name: 'N8nIcon',
		props: ['icon'],
		template: '<i :data-icon="icon" />',
	},
	N8nIconButton: {
		name: 'N8nIconButton',
		props: ['icon'],
		template: '<button v-bind="$attrs"><i :data-icon="icon" /></button>',
	},
	N8nSwitch: {
		name: 'N8nSwitch',
		props: ['modelValue'],
		template: '<button data-testid="full-width-switch" v-bind="$attrs" />',
	},
	N8nTooltip: {
		name: 'N8nTooltip',
		props: ['content'],
		template: '<div><slot /></div>',
	},
};

const thread = {
	id: 'thread-1',
	canContinueInPreview: false,
	agentId: 'agent-1',
	agentName: 'Agent',
	parentThreadId: null,
	parentAgentId: null,
	projectId: 'project-1',
	taskId: null,
	sessionNumber: 1,
	title: 'Session',
	emoji: null,
	totalPromptTokens: 100,
	totalCompletionTokens: 25,
	totalCost: 0.125,
	totalDuration: 1500,
	createdAt: '2026-08-26T16:00:00.000Z',
	updatedAt: '2026-08-26T16:32:00.000Z',
} satisfies ThreadDetail['thread'];

const slackExecution = mock<AgentExecution>({ source: 'slack', duration: 0 });
const defaultDetail: ThreadDetail = { thread, executions: [slackExecution] };

type MenuProps = InstanceType<typeof AgentPreviewMoreMenu>['$props'];

const defaultProps = {
	projectId: 'project-1',
	agentId: 'agent-1',
	effectiveSessionId: 'thread-1',
	hasSession: true,
	isFullWidth: false,
	isLangSmithExportEnabled: false,
	isExporting: false,
	isDeletingSession: false,
	canDeleteSession: true,
	getConversationMarkdown: function getConversationMarkdown() {
		return '**User:**\n\nHello';
	},
} satisfies MenuProps;

function mountMenu(overrides: Partial<MenuProps> = {}) {
	return mount(AgentPreviewMoreMenu, {
		props: { ...defaultProps, ...overrides },
		global: { stubs: { ...stubs, DropdownMenu: stubs.N8nDropdownMenu, Switch: stubs.N8nSwitch } },
	});
}

function getDropdown(wrapper: ReturnType<typeof mountMenu>) {
	return wrapper.getComponent({ name: 'N8nDropdownMenu' });
}

function getMenuItem(wrapper: ReturnType<typeof mountMenu>, id: string) {
	const items: Array<DropdownMenuItemProps<string>> = getDropdown(wrapper).props('items');
	return items.find(function matchesId(item) {
		return item.id === id;
	});
}

beforeEach(function resetMocks() {
	vi.clearAllMocks();
	getThreadDetail.mockReset().mockResolvedValue(defaultDetail);
	clipboardCopy.mockReset().mockResolvedValue(undefined);
});

describe('AgentPreviewMoreMenu', function describeMenu() {
	it('renders a leading icon for each default menu item', function rendersIcons() {
		const wrapper = mountMenu();

		expect(
			wrapper.findAll('[data-menu-item]').map(function getItemIcon(item) {
				return {
					id: item.attributes('data-menu-item'),
					icon: item.get('i').attributes('data-icon'),
				};
			}),
		).toEqual([
			{ id: 'copy-link', icon: 'link' },
			{ id: 'copy-conversation', icon: 'copy' },
			{ id: 'open-in-new-tab', icon: 'external-link' },
			{ id: 'toggle-full-width', icon: 'maximize-2' },
			{ id: 'delete-session', icon: 'trash' },
		]);
	});

	it('copies a link to the active session', async function copiesLink() {
		const wrapper = mountMenu();

		getDropdown(wrapper).vm.$emit('select', 'copy-link');
		await flushPromises();

		expect(routerResolve).toHaveBeenCalledWith({
			name: 'AgentBuilderView',
			params: { projectId: 'project-1', agentId: 'agent-1' },
			query: { continueSessionId: 'thread-1', openPreview: 'true' },
		});
		expect(clipboardCopy).toHaveBeenCalledWith('http://localhost:3000/resolved-preview');
		expect(showMessage).toHaveBeenCalledWith({
			title: 'agents.builder.preview.more.linkCopied',
			type: 'success',
		});
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
			{ ...editorContext, option: 'copy-link' },
		);
	});

	it('copies the supplied conversation markdown', async function copiesConversation() {
		const wrapper = mountMenu();

		getDropdown(wrapper).vm.$emit('select', 'copy-conversation');
		await flushPromises();

		expect(clipboardCopy).toHaveBeenCalledWith('**User:**\n\nHello');
		expect(showMessage).toHaveBeenCalledWith({
			title: 'agents.builder.preview.more.conversationCopied',
			type: 'success',
		});
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
			{ ...editorContext, option: 'copy-conversation' },
		);
	});

	it('does not copy an empty conversation', async function skipsEmptyConversation() {
		const wrapper = mountMenu({ getConversationMarkdown: vi.fn().mockReturnValue('') });

		getDropdown(wrapper).vm.$emit('select', 'copy-conversation');
		await flushPromises();

		expect(clipboardCopy).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
			{ ...editorContext, option: 'copy-conversation' },
		);
	});

	it.each([
		['copy-link', 'agents.builder.preview.more.copyLinkError'],
		['copy-conversation', 'agents.builder.preview.more.copyConversationError'],
	])('reports a clipboard failure for %s', async function reportsCopyError(itemId, title) {
		const error = new Error('Clipboard unavailable');
		clipboardCopy.mockRejectedValueOnce(error);
		const wrapper = mountMenu();

		getDropdown(wrapper).vm.$emit('select', itemId);
		await flushPromises();

		expect(showError).toHaveBeenCalledExactlyOnceWith(error, title);
		expect(showMessage).not.toHaveBeenCalled();
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
			{ ...editorContext, option: itemId },
		);
		expect(track.mock.invocationCallOrder[0]).toBeLessThan(
			clipboardCopy.mock.invocationCallOrder[0],
		);
	});

	it('disables session-dependent copy actions without a session', function disablesCopy() {
		const wrapper = mountMenu({ hasSession: false, effectiveSessionId: undefined });

		expect(getMenuItem(wrapper, 'copy-link')).toMatchObject({ disabled: true });
		expect(getMenuItem(wrapper, 'copy-conversation')).toMatchObject({ disabled: true });
		for (const option of ['copy-link', 'copy-conversation', 'open-in-new-tab']) {
			getDropdown(wrapper).vm.$emit('select', option);
		}
		expect(track).not.toHaveBeenCalled();
		expect(clipboardCopy).not.toHaveBeenCalled();
		expect(routerResolve).not.toHaveBeenCalled();
	});

	it('opens the active session in a new tab', function opensSession() {
		const open = vi.spyOn(window, 'open').mockImplementation(function openWindow() {
			return null;
		});
		try {
			const wrapper = mountMenu();
			getDropdown(wrapper).vm.$emit('select', 'open-in-new-tab');

			expect(routerResolve).toHaveBeenCalledExactlyOnceWith({
				name: 'AgentPreviewView',
				params: { projectId: 'project-1', agentId: 'agent-1' },
				query: { continueSessionId: 'thread-1' },
			});
			expect(open).toHaveBeenCalledExactlyOnceWith('/resolved-preview', '_blank', 'noopener');
			expect(track).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
				{ ...editorContext, option: 'open-in-new-tab' },
			);
		} finally {
			open.mockRestore();
		}
	});

	it('hides the full-width option when the host controls the width', () => {
		const wrapper = mountMenu({ canToggleFullWidth: false });
		expect(getMenuItem(wrapper, 'toggle-full-width')).toBeUndefined();
		getDropdown(wrapper).vm.$emit('select', 'toggle-full-width');
		expect(wrapper.emitted('toggle-full-width')).toBeUndefined();
	});

	it('emits an event to toggle full width', function togglesFullWidth() {
		const wrapper = mountMenu();
		getDropdown(wrapper).vm.$emit('select', 'toggle-full-width');
		expect(wrapper.emitted('toggle-full-width')).toEqual([[]]);
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
			{ ...editorContext, option: 'toggle-full-width' },
		);
	});

	it.each([false, true])(
		'renders the full-width state as %s with a non-interactive indicator',
		function rendersFullWidthState(isFullWidth) {
			const wrapper = mountMenu({ isFullWidth });

			expect(getMenuItem(wrapper, 'toggle-full-width')).toMatchObject({
				checked: isFullWidth,
				checkbox: true,
				keepOpen: true,
			});
			expect(wrapper.getComponent({ name: 'N8nSwitch' }).props('modelValue')).toBe(isFullWidth);
			expect(wrapper.get('[data-testid="full-width-switch"]').attributes()).toMatchObject({
				'aria-hidden': 'true',
				tabindex: '-1',
			});
		},
	);

	it('emits an event to delete the session', function deletesSession() {
		const wrapper = mountMenu();

		expect(getMenuItem(wrapper, 'delete-session')).toMatchObject({
			disabled: false,
			destructive: true,
		});
		getDropdown(wrapper).vm.$emit('select', 'delete-session');
		expect(wrapper.emitted('delete-session')).toEqual([[]]);
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
			{ ...editorContext, option: 'delete-session' },
		);
	});

	it('omits and guards deletion for viewers', function blocksViewerDeletion() {
		const wrapper = mountMenu({ canDeleteSession: false });

		expect(getMenuItem(wrapper, 'delete-session')).toBeUndefined();
		getDropdown(wrapper).vm.$emit('select', 'delete-session');
		expect(wrapper.emitted('delete-session')).toBeUndefined();
		expect(track).not.toHaveBeenCalled();
	});

	it.each([{ hasSession: false }, { effectiveSessionId: undefined }, { isDeletingSession: true }])(
		'blocks deletion with %j',
		function blocksDeletion(overrides) {
			const wrapper = mountMenu(overrides);

			expect(getMenuItem(wrapper, 'delete-session')).toMatchObject({ disabled: true });
			getDropdown(wrapper).vm.$emit('select', 'delete-session');
			expect(wrapper.emitted('delete-session')).toBeUndefined();
			expect(track).not.toHaveBeenCalled();
		},
	);

	it.each([
		{ isLangSmithExportEnabled: false },
		{ hasSession: false },
		{ effectiveSessionId: undefined },
	])('hides export with %j', function hidesExport(overrides) {
		const wrapper = mountMenu({ isLangSmithExportEnabled: true, ...overrides });
		expect(getMenuItem(wrapper, 'export-session')).toBeUndefined();
		getDropdown(wrapper).vm.$emit('select', 'export-session');
		expect(wrapper.emitted('export-session')).toBeUndefined();
		expect(track).not.toHaveBeenCalled();
	});

	it('shows export with an icon and emits its event', function exportsSession() {
		const wrapper = mountMenu({ isLangSmithExportEnabled: true });

		expect(getMenuItem(wrapper, 'export-session')).toMatchObject({
			icon: { type: 'icon', value: 'bug' },
			disabled: false,
		});
		getDropdown(wrapper).vm.$emit('select', 'export-session');
		expect(wrapper.emitted('export-session')).toEqual([[]]);
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
			{ ...editorContext, option: 'export-session' },
		);
	});

	it('blocks another export while one is in progress', function blocksExport() {
		const wrapper = mountMenu({ isLangSmithExportEnabled: true, isExporting: true });

		expect(getMenuItem(wrapper, 'export-session')).toMatchObject({ disabled: true });
		getDropdown(wrapper).vm.$emit('select', 'export-session');
		expect(wrapper.emitted('export-session')).toBeUndefined();
		expect(track).not.toHaveBeenCalled();
	});

	it('hides unavailable pricing and keeps the token count', async () => {
		getThreadDetail.mockResolvedValueOnce({ thread: { ...thread, totalCost: 0 }, executions: [] });
		const wrapper = mountMenu();
		await flushPromises();
		expect(wrapper.text()).toContain('125t');
		expect(wrapper.text()).not.toContain('$');
	});

	it('hides token and price values before usage is known', async () => {
		getThreadDetail.mockResolvedValueOnce({
			thread: { ...thread, totalPromptTokens: 0, totalCompletionTokens: 0, totalCost: 0 },
			executions: [],
		});
		const wrapper = mountMenu();
		await flushPromises();
		expect(wrapper.text()).not.toContain('0t');
		expect(wrapper.text()).not.toContain('$');
	});

	it.each([false, true])('hides unknown duration when usage is known: %s', async (usageKnown) => {
		getThreadDetail.mockResolvedValueOnce({
			thread: {
				...thread,
				totalPromptTokens: usageKnown ? 100 : 0,
				totalCompletionTokens: usageKnown ? 25 : 0,
				totalCost: usageKnown ? 0.125 : 0,
				totalDuration: 0,
			},
			executions: [
				mock<AgentExecution>({ id: 'live-1', source: null, status: 'running', duration: 0 }),
			],
		});
		const wrapper = mountMenu();
		await flushPromises();
		expect(wrapper.text()).not.toContain('0ms');
		expect(wrapper.text()).not.toContain('•');
		if (usageKnown) expect(wrapper.text()).toContain('125t ($0.1250)');
		await wrapper.setProps({
			usageUpdates: {
				'live-1': {
					sessionId: 'thread-1',
					executionId: 'live-1',
					complete: false,
					duration: 2000,
				},
			},
		});
		expect(wrapper.text()).toContain('2.0s');
		expect(wrapper.text().includes('•')).toBe(usageKnown);
	});

	it('hides a partial session price when the live turn has a zero cost', async () => {
		const wrapper = mountMenu();
		await flushPromises();
		await wrapper.setProps({
			usageUpdates: {
				'live-1': {
					sessionId: 'thread-1',
					executionId: 'live-1',
					complete: false,
					usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0 },
				},
			},
		});
		expect(wrapper.text()).toContain('140t');
		expect(wrapper.text()).not.toContain('$');
	});

	it('uses server duration without advancing during delayed completion', async () => {
		vi.useFakeTimers();
		try {
			getThreadDetail.mockResolvedValue({
				thread,
				executions: [
					mock<AgentExecution>({ id: 'live-1', source: null, status: 'running', duration: 0 }),
				],
			});
			const wrapper = mountMenu();
			await flushPromises();
			await vi.advanceTimersByTimeAsync(2000);
			expect(wrapper.text()).toContain('1.5s');
			function pushDuration(duration: number, complete = false) {
				for (const listener of pushListeners)
					listener({
						type: 'agentExecutionUpdated',
						data: {
							projectId: 'project-1',
							agentId: 'agent-1',
							threadId: 'thread-1',
							executionId: 'live-1',
							duration,
							complete,
							...(complete
								? {}
								: {
										usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30, cost: 0.05 },
									}),
						},
					});
			}
			pushDuration(2000);
			await flushPromises();
			expect(wrapper.text()).toContain('155t ($0.1750)');
			expect(wrapper.text()).toContain('3.5s');
			await vi.advanceTimersByTimeAsync(2000);
			expect(wrapper.text()).toContain('3.5s');
			pushDuration(2300, true);
			await flushPromises();
			await wrapper.setProps({
				usageUpdates: {
					'live-1': { sessionId: 'thread-1', executionId: 'live-1', complete: true },
				},
			});
			pushDuration(2200);
			await flushPromises();
			await vi.advanceTimersByTimeAsync(3000);
			expect(wrapper.text()).toContain('3.8s');
			wrapper.unmount();
		} finally {
			vi.useRealTimers();
		}
	});

	it.each([undefined, 'thread-2'])(
		'ignores usage for an unselected session when the current session is %s',
		async (effectiveSessionId) => {
			getThreadDetail.mockImplementation(async (_projectId, _agentId, threadId) => ({
				thread: { ...thread, id: threadId },
				executions: [],
			}));
			const wrapper = mountMenu({ effectiveSessionId, hasSession: !!effectiveSessionId });
			await flushPromises();
			const update = {
				type: 'agentExecutionUpdated',
				data: {
					projectId: 'project-1',
					agentId: 'agent-1',
					threadId: 'thread-1',
					executionId: 'live-1',
					usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.025 },
				},
			} satisfies PushMessage;
			for (const listener of pushListeners) listener(update);
			await flushPromises();

			await wrapper.setProps({ effectiveSessionId: 'thread-1', hasSession: true });
			await flushPromises();
			expect(wrapper.text()).toContain('125t ($0.1250)');

			for (const listener of pushListeners) listener(update);
			await flushPromises();
			expect(wrapper.text()).toContain('140t ($0.1500)');
		},
	);

	it('replaces turn snapshots and reconciles them with the saved result', async () => {
		const wrapper = mountMenu();
		await flushPromises();
		const update = {
			sessionId: 'thread-1',
			executionId: 'live-1',
			complete: false,
			usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.025 },
		};
		await wrapper.setProps({ usageUpdates: { 'live-1': update } });
		expect(wrapper.text()).toContain('140t ($0.1500)');
		const next = {
			...update,
			usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30, cost: 0.05 },
		};
		await wrapper.setProps({ usageUpdates: { 'live-1': next } });
		expect(wrapper.text()).toContain('155t ($0.1750)');
		getThreadDetail.mockResolvedValueOnce({
			thread: { ...thread, totalPromptTokens: 120, totalCompletionTokens: 35, totalCost: 0.18 },
			executions: [
				mock<AgentExecution>({
					id: 'live-1',
					source: null,
					status: 'success',
					totalTokens: 30,
					cost: 0.055,
				}),
			],
		});
		await wrapper.setProps({ usageUpdates: { 'live-1': { ...next, complete: true } } });
		await flushPromises();
		expect(wrapper.text()).toContain('155t ($0.1800)');
	});

	it('loads a new session when its first usage update arrives', async () => {
		getThreadDetail.mockRejectedValueOnce({ httpStatusCode: 404 });
		const wrapper = mountMenu();
		await flushPromises();
		getThreadDetail.mockResolvedValueOnce({
			thread: { ...thread, totalPromptTokens: 0, totalCompletionTokens: 0, totalCost: 0 },
			executions: [],
		});
		await wrapper.setProps({
			usageUpdates: {
				'execution-1': {
					sessionId: 'thread-1',
					executionId: 'execution-1',
					complete: false,
					usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.025 },
				},
			},
		});
		await flushPromises();
		expect(wrapper.text()).toContain('15t ($0.0250)');
	});

	it('loads current metadata when the menu opens', async function refreshesMetadata() {
		const wrapper = mountMenu();
		await flushPromises();
		getThreadDetail.mockClear();
		expect(track).not.toHaveBeenCalled();

		getDropdown(wrapper).vm.$emit('update:modelValue', true);
		await flushPromises();

		expect(getThreadDetail).toHaveBeenCalledExactlyOnceWith('project-1', 'agent-1', 'thread-1');
		expect(wrapper.find('[data-icon="slack"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Slack');
		expect(wrapper.text()).toContain('125t ($0.1250) • 1.5s');
		expect(wrapper.text()).toContain('agents.builder.preview.more.lastMessageSent:');

		getDropdown(wrapper).vm.$emit('update:modelValue', false);
		await flushPromises();
		expect(getThreadDetail).toHaveBeenCalledTimes(1);
		await wrapper.setProps({ effectiveSessionId: 'thread-2' });
		await flushPromises();
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_MORE_OPTIONS_FROM_TEST_PANEL,
			editorContext,
		);
	});

	it.each([
		['slack', 'Slack', 'slack'],
		['telegram', 'Telegram', 'telegram'],
		['linear', 'Linear', 'linear'],
		['discord', 'Discord', 'discord'],
		['teams', 'Teams', 'teams'],
		['mcp', 'Mcp', 'mcp'],
		['workflow', 'Workflow', 'workflow'],
		['webhook', 'Webhook', 'webhook'],
		['instance-ai', 'agentSessions.origin.instanceAi', 'sparkles'],
		['n8n_chat_production', 'agentSessions.origin.n8nChat', 'message-square'],
		['chat', 'agentSessions.origin.preview', 'bolt-filled'],
		['n8n_chat', 'agentSessions.origin.preview', 'bolt-filled'],
		[null, 'agentSessions.origin.preview', 'bolt-filled'],
	])(
		'uses the first non-null execution source for %s',
		async function rendersSource(source, label, icon) {
			getThreadDetail.mockResolvedValueOnce({
				thread,
				executions: [mock<AgentExecution>({ source: null }), mock<AgentExecution>({ source })],
			});
			const wrapper = mountMenu();
			await flushPromises();

			expect(wrapper.text()).toContain(label);
			expect(wrapper.find(`[data-icon="${icon}"]`).exists()).toBe(true);
		},
	);

	it('does not request metadata without a session ID', async function skipsMissingSession() {
		const wrapper = mountMenu({ hasSession: false, effectiveSessionId: undefined });
		getDropdown(wrapper).vm.$emit('update:modelValue', true);
		await flushPromises();

		expect(getThreadDetail).not.toHaveBeenCalled();
		expect(wrapper.text()).not.toContain('125t');
	});

	it('clears metadata when a request fails', async function clearsFailedMetadata() {
		const wrapper = mountMenu();
		await flushPromises();
		getThreadDetail.mockRejectedValueOnce(new Error('Request failed'));

		getDropdown(wrapper).vm.$emit('update:modelValue', true);
		await flushPromises();

		expect(wrapper.find('[data-icon="slack"]').exists()).toBe(false);
		expect(wrapper.text()).not.toContain('125t');
		expect(wrapper.text()).not.toContain('agents.builder.preview.more.lastMessageSent:');
	});

	it.each(['resolve', 'reject'] as const)(
		'ignores an older request that completes with %s after a session change',
		async function ignoresOlderRequest(outcome) {
			const pending = Promise.withResolvers<ThreadDetail>();
			getThreadDetail.mockReturnValueOnce(pending.promise);
			const wrapper = mountMenu();
			getThreadDetail.mockResolvedValueOnce({
				thread: { ...thread, id: 'thread-2', totalPromptTokens: 200 },
				executions: [],
			});

			await wrapper.setProps({ effectiveSessionId: 'thread-2' });
			await flushPromises();
			if (outcome === 'resolve') pending.resolve(defaultDetail);
			else pending.reject(new Error('Old request failed'));
			await flushPromises();

			expect(getThreadDetail).toHaveBeenLastCalledWith('project-1', 'agent-1', 'thread-2');
			expect(wrapper.text()).toContain('225t');
			expect(wrapper.find('[data-icon="slack"]').exists()).toBe(false);
		},
	);

	it('clears metadata when the session is removed', async function clearsRemovedSession() {
		const wrapper = mountMenu();
		await flushPromises();

		await wrapper.setProps({ effectiveSessionId: undefined });
		await flushPromises();

		expect(wrapper.text()).not.toContain('125t');
		expect(wrapper.find('[data-icon="slack"]').exists()).toBe(false);
		expect(getThreadDetail).toHaveBeenCalledTimes(1);
	});
});

describe('AgentPreviewMoreMenu with design system components', function describeRealMenu() {
	it('supports keyboard toggling without closing and blocks disabled deletion', async function usesRealControls() {
		const user = userEvent.setup();
		const view = render(AgentPreviewMoreMenu, {
			props: { ...defaultProps, isDeletingSession: true },
		});
		expect(track).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: 'agents.builder.preview.more.label' }));
		const fullWidthItem = await screen.findByRole('menuitemcheckbox', {
			name: 'agents.builder.preview.more.fullWidth',
		});
		expect(fullWidthItem).toHaveAttribute('aria-checked', 'false');
		const switchControl = fullWidthItem.querySelector('[role="switch"]');
		expect(switchControl).toHaveAttribute('aria-hidden', 'true');
		expect(switchControl).toHaveAttribute('tabindex', '-1');

		fullWidthItem.focus();
		await user.keyboard('{Enter}');
		expect(view.emitted('toggle-full-width')).toEqual([[]]);
		await view.rerender({ isFullWidth: true });
		await waitFor(function checksUpdatedState() {
			expect(fullWidthItem).toHaveAttribute('aria-checked', 'true');
			expect(screen.getByRole('menu')).toBeVisible();
		});

		const deleteItem = screen.getByRole('menuitem', { name: 'agentSessions.delete' });
		expect(deleteItem).toHaveAttribute('aria-disabled', 'true');
		await user.click(deleteItem);
		expect(view.emitted('delete-session')).toBeUndefined();
		expect(screen.getByRole('menu')).toBeVisible();
		expect(track.mock.calls).toEqual([
			[TELEMETRY_EVENT.AGENTS.USER_CLICKED_MORE_OPTIONS_FROM_TEST_PANEL, editorContext],
			[
				TELEMETRY_EVENT.AGENTS.USER_CLICKED_AN_OPTION_FROM_MORE_LIST,
				{ ...editorContext, option: 'toggle-full-width' },
			],
		]);
	});
});
