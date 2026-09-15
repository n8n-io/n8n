/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import type { DropdownMenuItemProps } from '@n8n/design-system';
import userEvent from '@testing-library/user-event';
import { cleanup, render, screen, waitFor } from '@testing-library/vue';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

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

const slackExecution = mock<AgentExecution>({ source: 'slack' });
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
	});

	it('does not copy an empty conversation', async function skipsEmptyConversation() {
		const wrapper = mountMenu({ getConversationMarkdown: vi.fn().mockReturnValue('') });

		getDropdown(wrapper).vm.$emit('select', 'copy-conversation');
		await flushPromises();

		expect(clipboardCopy).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
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
	});

	it('disables session-dependent copy actions without a session', function disablesCopy() {
		const wrapper = mountMenu({ hasSession: false, effectiveSessionId: undefined });

		expect(getMenuItem(wrapper, 'copy-link')).toMatchObject({ disabled: true });
		expect(getMenuItem(wrapper, 'copy-conversation')).toMatchObject({ disabled: true });
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
		} finally {
			open.mockRestore();
		}
	});

	it('emits an event to toggle full width', function togglesFullWidth() {
		const wrapper = mountMenu();
		getDropdown(wrapper).vm.$emit('select', 'toggle-full-width');
		expect(wrapper.emitted('toggle-full-width')).toEqual([[]]);
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
	});

	it.each([{ hasSession: false }, { effectiveSessionId: undefined }, { isDeletingSession: true }])(
		'blocks deletion with %j',
		function blocksDeletion(overrides) {
			const wrapper = mountMenu(overrides);

			expect(getMenuItem(wrapper, 'delete-session')).toMatchObject({ disabled: true });
			getDropdown(wrapper).vm.$emit('select', 'delete-session');
			expect(wrapper.emitted('delete-session')).toBeUndefined();
		},
	);

	it.each([
		{ isLangSmithExportEnabled: false },
		{ hasSession: false },
		{ effectiveSessionId: undefined },
	])('hides export with %j', function hidesExport(overrides) {
		const wrapper = mountMenu({ isLangSmithExportEnabled: true, ...overrides });
		expect(getMenuItem(wrapper, 'export-session')).toBeUndefined();
	});

	it('shows export with an icon and emits its event', function exportsSession() {
		const wrapper = mountMenu({ isLangSmithExportEnabled: true });

		expect(getMenuItem(wrapper, 'export-session')).toMatchObject({
			icon: { type: 'icon', value: 'bug' },
			disabled: false,
		});
		getDropdown(wrapper).vm.$emit('select', 'export-session');
		expect(wrapper.emitted('export-session')).toEqual([[]]);
	});

	it('blocks another export while one is in progress', function blocksExport() {
		const wrapper = mountMenu({ isLangSmithExportEnabled: true, isExporting: true });

		expect(getMenuItem(wrapper, 'export-session')).toMatchObject({ disabled: true });
		getDropdown(wrapper).vm.$emit('select', 'export-session');
		expect(wrapper.emitted('export-session')).toBeUndefined();
	});

	it('loads current metadata when the menu opens', async function refreshesMetadata() {
		const wrapper = mountMenu();
		await flushPromises();
		getThreadDetail.mockClear();

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
	});

	it.each([
		['slack', 'Slack', 'slack'],
		['telegram', 'Telegram', 'telegram'],
		['linear', 'Linear', 'linear'],
		['discord', 'Discord', 'discord'],
		['mcp', 'Mcp', 'mcp'],
		['workflow', 'Workflow', 'workflow'],
		['webhook', 'Webhook', 'webhook'],
		['instance-ai', 'agentSessions.origin.instanceAi', 'sparkles'],
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
	});
});
