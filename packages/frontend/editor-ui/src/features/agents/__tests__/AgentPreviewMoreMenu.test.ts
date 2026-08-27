/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentPreviewMoreMenu from '../components/AgentPreviewMoreMenu.vue';

const { clipboardCopy, getThreadDetail, routerResolve, showMessage } = vi.hoisted(
	function createMocks() {
		return {
			clipboardCopy: vi.fn(),
			getThreadDetail: vi.fn(),
			routerResolve: vi.fn(function resolveRoute() {
				return { href: '/resolved-preview' };
			}),
			showMessage: vi.fn(),
		};
	},
);

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: () => ({ copy: clipboardCopy }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate?.date ? `${key}:${options.interpolate.date}` : key,
	}),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: routerResolve }),
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => ({ getThreadDetail }),
}));

vi.mock('@n8n/design-system', () => ({
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
}));

type DropdownWrapper = VueWrapper<{
	items: Array<{ id: string; icon?: { value: string }; checked?: boolean }>;
	$emit: (event: 'select' | 'update:modelValue', value: string | boolean) => void;
}>;

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
	source: 'slack',
};

function mountMenu(overrides: Partial<{ hasSession: boolean; isFullWidth: boolean }> = {}) {
	return mount(AgentPreviewMoreMenu, {
		props: {
			projectId: 'project-1',
			agentId: 'agent-1',
			effectiveSessionId: 'thread-1',
			hasSession: true,
			isFullWidth: false,
			getConversationMarkdown: () => '**User:**\n\nHello',
			...overrides,
		},
	});
}

function getDropdown(wrapper: ReturnType<typeof mountMenu>) {
	return wrapper.getComponent({ name: 'N8nDropdownMenu' }) as DropdownWrapper;
}

describe('AgentPreviewMoreMenu', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getThreadDetail.mockResolvedValue({ thread, executions: [] });
		clipboardCopy.mockResolvedValue(undefined);
	});

	it('renders a leading icon for every menu item', () => {
		const wrapper = mountMenu();

		expect(
			wrapper.findAll('[data-menu-item]').map((item) => ({
				id: item.attributes('data-menu-item'),
				icon: item.get('i').attributes('data-icon'),
			})),
		).toEqual([
			{ id: 'copy-link', icon: 'link' },
			{ id: 'copy-conversation', icon: 'copy' },
			{ id: 'open-in-new-tab', icon: 'external-link' },
			{ id: 'toggle-full-width', icon: 'maximize-2' },
		]);
	});

	it('copies a link to the active session', async () => {
		const wrapper = mountMenu();

		getDropdown(wrapper).vm.$emit('select', 'copy-link');
		await flushPromises();

		expect(routerResolve).toHaveBeenCalledWith({
			name: 'AgentPreviewView',
			params: { projectId: 'project-1', agentId: 'agent-1' },
			query: { continueSessionId: 'thread-1' },
		});
		expect(clipboardCopy).toHaveBeenCalledWith('http://localhost:3000/resolved-preview');
		expect(showMessage).toHaveBeenCalledWith({
			title: 'agents.builder.preview.more.linkCopied',
			type: 'success',
		});
	});

	it('copies the complete conversation', async () => {
		const wrapper = mountMenu();

		getDropdown(wrapper).vm.$emit('select', 'copy-conversation');
		await flushPromises();

		expect(clipboardCopy).toHaveBeenCalledWith('**User:**\n\nHello');
		expect(showMessage).toHaveBeenCalledWith({
			title: 'agents.builder.preview.more.conversationCopied',
			type: 'success',
		});
	});

	it('opens the active session in a new tab', () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null);
		const wrapper = mountMenu();

		getDropdown(wrapper).vm.$emit('select', 'open-in-new-tab');

		expect(open).toHaveBeenCalledWith('/resolved-preview', '_blank', 'noopener');
		open.mockRestore();
	});

	it('emits an event to toggle full width', () => {
		const wrapper = mountMenu();

		getDropdown(wrapper).vm.$emit('select', 'toggle-full-width');

		expect(wrapper.emitted('toggle-full-width')).toEqual([[]]);
	});

	it('renders the full-width switch as a non-interactive indicator', () => {
		const wrapper = mountMenu({ isFullWidth: true });
		const switchControl = wrapper.get('[data-testid="full-width-switch"]');
		const fullWidthItem = getDropdown(wrapper).vm.items.find(
			(item) => item.id === 'toggle-full-width',
		);

		expect(fullWidthItem?.checked).toBe(true);
		expect(switchControl.attributes()).toMatchObject({
			'aria-hidden': 'true',
			tabindex: '-1',
		});
	});

	it('loads current metadata when the menu opens', async () => {
		const wrapper = mountMenu();
		await flushPromises();
		getThreadDetail.mockClear();

		getDropdown(wrapper).vm.$emit('update:modelValue', true);
		await flushPromises();

		expect(getThreadDetail).toHaveBeenCalledExactlyOnceWith('project-1', 'agent-1', 'thread-1');
		expect(wrapper.find('[data-icon="slack"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('125t ($0.1250) • 1.5s');
	});
});
