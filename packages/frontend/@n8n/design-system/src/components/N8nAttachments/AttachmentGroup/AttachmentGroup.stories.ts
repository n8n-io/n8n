import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nAttachmentGroup from './AttachmentGroup.vue';

const meta = {
	title: 'Experimental/AttachmentGroup',
	component: N8nAttachmentGroup,
} satisfies Meta<typeof N8nAttachmentGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholders: Story = {
	render: function renderPlaceholders() {
		return {
			components: { N8nAttachmentGroup },
			template: `
				<N8nAttachmentGroup>
					<div
						v-for="index in 12"
						:key="index"
						style="
							width: var(--height--4xl);
							height: var(--height--4xl);
							flex-shrink: 0;
							outline:2px solid var(--background--surface);
							background: var(--color--neutral-200);
							border-radius: var(--radius--lg);
						"
					/>
				</N8nAttachmentGroup>
			`,
		};
	},
};

export const Default: Story = {
	render: function renderGroup() {
		return {
			components: { N8nAttachmentGroup: N8nAttachmentGroup },
			template:
				'<N8nAttachmentGroup><span>example.pdf</span><span>image.png</span></N8nAttachmentGroup>',
		};
	},
};
