import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nAnimatedCollapsibleContent, { CollapsibleRoot, CollapsibleTrigger } from './index';

const meta = {
	title: 'Core/AnimatedCollapsibleContent',
	component: N8nAnimatedCollapsibleContent,
	parameters: {
		docs: {
			description: {
				component:
					'Collapsible content that slides open and closed. Place it inside CollapsibleRoot, after CollapsibleTrigger.',
			},
		},
	},
} satisfies Meta<typeof N8nAnimatedCollapsibleContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: {
			N8nAnimatedCollapsibleContent,
			CollapsibleRoot,
			CollapsibleTrigger,
		},
		setup() {
			return { args };
		},
		template: `
			<CollapsibleRoot default-open>
				<CollapsibleTrigger>Details</CollapsibleTrigger>
				<N8nAnimatedCollapsibleContent :blur="args.blur">
					This content slides open and closed with the disclosure.<br />
					The block is long enough that the height change is easy to see.<br />
					Open the disclosure to watch the region grow.<br />
					Close it to watch the region shrink.<br />
					The text stays plain so the motion is the only thing on screen.
				</N8nAnimatedCollapsibleContent>
			</CollapsibleRoot>
		`,
	}),
};
