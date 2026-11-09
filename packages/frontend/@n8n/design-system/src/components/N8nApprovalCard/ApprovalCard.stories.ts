import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, within } from 'storybook/test';

import N8nApprovalCard from './ApprovalCard.vue';

const meta = {
	title: 'Areas/Assistant/ApprovalCard',
	component: N8nApprovalCard,
	args: {
		title: 'The agent wants to run the Calculator tool.',
		supportsSessionApproval: true,
	},
} satisfies Meta<typeof N8nApprovalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NarrowWithLongUrl: Story = {
	decorators: [
		() => ({
			// Match a narrow Assistant panel. The spacing scale has no panel-width token.
			template: '<div style="width: 390px; max-width: 100%;"><story /></div>',
		}),
	],
	args: {
		title: 'Allow n8n Assistant to access example.com?',
		description:
			'https://example.com/api/map?minLat=36.70&minLng=-4.45&maxLat=36.73&maxLng=-4.40&filter=abcdefghijklmnopqrstuvwxyz0123456789',
		options: [
			{
				key: 'allow-domain',
				icon: 'check',
				label: 'Always allow example.com',
				suffix: 'during this session',
			},
			{ key: 'allow-once', icon: 'check', label: 'Allow once' },
			{ key: 'deny', icon: 'ban', label: 'Deny', withArrow: false },
		],
	},
	async play({ canvasElement }) {
		const canvas = within(canvasElement);
		const card = canvas.getByRole('article');
		const description = canvas.getByRole('region');
		await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
		await expect(description.scrollWidth).toBeLessThanOrEqual(description.clientWidth);
		for (const row of canvasElement.querySelectorAll('[role="toolbar"] button')) {
			const bounds = row.getBoundingClientRect();
			await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
			for (const child of row.children) {
				const childBounds = child.getBoundingClientRect();
				await expect(childBounds.top).toBeGreaterThanOrEqual(bounds.top);
				await expect(childBounds.bottom).toBeLessThanOrEqual(bounds.bottom);
			}
		}
	},
};

export const NarrowWithLongLabel: Story = {
	...NarrowWithLongUrl,
	args: {
		...NarrowWithLongUrl.args,
		options: [
			{
				key: 'allow-domain',
				icon: 'check',
				label: 'Always allow abcdefghijklmnopqrstuvwxyz0123456789.example.com',
				suffix: 'during this session',
			},
			{ key: 'allow-once', icon: 'check', label: 'Allow once' },
			{ key: 'deny', icon: 'ban', label: 'Deny', withArrow: false },
		],
	},
};

export const CollapsedArguments: Story = {
	args: {
		args: { query: 'Example tool input' },
		defaultCollapsed: true,
	},
};

export const KeyboardNavigation: Story = {
	args: {
		description:
			'Use Arrow Up and Arrow Down to highlight a choice. Use Enter or Space to select it.',
	},
	play({ canvasElement }) {
		const listbox = canvasElement.querySelector('[role="toolbar"] button[tabindex="0"]');
		if (listbox instanceof HTMLElement) listbox.focus({ preventScroll: true });
	},
};

export const Disabled: Story = {
	args: { disabled: true },
};

export const Destructive: Story = {
	args: {
		title: 'Delete workflow?',
		description: 'This will permanently delete the workflow and its execution history.',
		supportsSessionApproval: false,
		destructive: true,
	},
};

export const Resolved: Story = {
	args: { disabled: true, decision: 'allowed' },
};
