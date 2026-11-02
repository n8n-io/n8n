import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nAttachment from './Attachment.vue';

const meta = {
	title: 'Experimental/Attachment',
	component: N8nAttachment,
	args: { fileName: 'example.pdf', mimeType: 'application/pdf' },
} satisfies Meta<typeof N8nAttachment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
