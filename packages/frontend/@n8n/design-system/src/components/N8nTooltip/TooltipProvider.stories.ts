import type { Meta, StoryObj } from '@storybook/vue3-vite';

import Tooltip from './Tooltip.vue';
import TooltipProvider from './TooltipProvider.vue';
import N8nButton from '../N8nButton/Button.vue';

const meta = {
	title: 'Core/TooltipProvider',
	component: TooltipProvider,
} satisfies Meta<typeof TooltipProvider>;
export default meta;

type Story = StoryObj<typeof meta>;

export const SharedDelay = {
	render: (args) => ({
		components: { TooltipProvider, Tooltip, N8nButton },
		setup: () => ({ args }),
		template: `
			<TooltipProvider v-bind="args">
				<div style="display: flex; gap: var(--spacing--md); padding: var(--spacing--xl);">
					<Tooltip content="First tooltip"><N8nButton label="First" /></Tooltip>
					<Tooltip content="Second tooltip"><N8nButton label="Second" /></Tooltip>
				</div>
			</TooltipProvider>
		`,
	}),
} satisfies Story;
