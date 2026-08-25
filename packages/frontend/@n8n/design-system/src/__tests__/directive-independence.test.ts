import { render, waitFor } from '@testing-library/vue';
import { config } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import BlockMessage from '../components/AskAssistantChat/messages/BlockMessage.vue';
import TextMessage from '../components/AskAssistantChat/messages/TextMessage.vue';
import CommandBarItem from '../components/N8nCommandBar/CommandBarItem.vue';
import EmptyState from '../components/N8nEmptyState/EmptyState.vue';
import InfoAccordion from '../components/N8nInfoAccordion/InfoAccordion.vue';
import InputLabel from '../components/N8nInputLabel/InputLabel.vue';
import Notice from '../components/N8nNotice/Notice.vue';
import Sticky from '../components/N8nSticky/Sticky.vue';
import Tabs from '../components/N8nTabs/Tabs.vue';
import Tooltip from '../components/N8nTooltip/Tooltip.vue';
import type { ChatUI } from '../types/assistant';

/**
 * Every component that renders text through `v-n8n-html` must render that text
 * for a consumer who never installed `N8nPlugin`. A missing global directive
 * used to produce an empty element, with no error and no console warning in a
 * production build.
 *
 * `src/__tests__/setup.ts` installs `N8nPlugin` for the whole suite, which is
 * what hid the defect. This file renders without it.
 */

const suitePlugins = config.global.plugins;

beforeAll(() => {
	config.global.plugins = [];
});
afterAll(() => {
	config.global.plugins = suitePlugins;
});

beforeEach(() => {
	setActivePinia(createPinia());
});

// N8nInputLabel and N8nTabs put their `v-n8n-html` element in the tooltip
// content slot. The stub renders that slot without the hover choreography, so
// the assertion stays about the directive and not about Reka UI open state.
const openTooltip = {
	N8nTooltip: {
		template: '<div><slot /><slot name="content" /></div>',
	},
};

const assistantMessage = (content: string): ChatUI.TextMessage & { id: string; read: boolean } => ({
	id: 'msg-1',
	role: 'assistant',
	type: 'text',
	content,
	read: true,
});

describe.each([
	['N8nNotice', () => render(Notice, { props: { content: 'notice content' } }), 'notice content'],
	[
		'N8nEmptyState',
		() => render(EmptyState, { props: { description: 'empty state description' } }),
		'empty state description',
	],
	[
		'N8nInfoAccordion',
		() =>
			render(InfoAccordion, {
				props: { description: 'accordion description', initiallyExpanded: true },
			}),
		'accordion description',
	],
	[
		'N8nTooltip',
		() =>
			render(Tooltip, {
				props: { content: 'tooltip content', visible: true, teleported: false },
				slots: { default: 'trigger' },
			}),
		'tooltip content',
	],
	[
		'N8nInputLabel',
		() =>
			render(InputLabel, {
				props: { label: 'label', tooltipText: 'input label tooltip' },
				global: { stubs: openTooltip },
			}),
		'input label tooltip',
	],
	[
		'N8nTabs',
		() =>
			render(Tabs, {
				props: { options: [{ value: 'a', label: 'A', tooltip: 'tab tooltip' }] },
				global: { stubs: openTooltip },
			}),
		'tab tooltip',
	],
	[
		'N8nSticky',
		() => render(Sticky, { props: { modelValue: 'note', editMode: true } }),
		// `sticky.markdownHint` is a link, so the label is the only visible text.
		'Markdown',
	],
	[
		'N8nCommandBar',
		() =>
			render(CommandBarItem, {
				props: {
					item: { id: '1', title: 'command', icon: { html: '<span>icon html</span>' } },
					isSelected: false,
				},
			}),
		'icon html',
	],
	[
		'AskAssistantChat TextMessage',
		() =>
			render(TextMessage, {
				props: { message: assistantMessage('assistant text'), isFirstOfRole: true },
			}),
		'assistant text',
	],
	[
		'AskAssistantChat BlockMessage',
		() =>
			render(BlockMessage, {
				props: {
					message: {
						id: 'msg-2',
						role: 'assistant',
						type: 'block',
						title: 'title',
						content: 'block body',
						read: true,
					},
					isFirstOfRole: true,
				},
			}),
		'block body',
	],
])('%s without a globally registered directive', (_name, renderComponent, expected) => {
	it(`renders "${'%s'}" text`.replace('%s', expected), async () => {
		const { container } = renderComponent();
		// N8nInfoAccordion expands and Reka UI mounts tooltip content after mount.
		await waitFor(() => expect(container.textContent).toContain(expected));
	});
});
