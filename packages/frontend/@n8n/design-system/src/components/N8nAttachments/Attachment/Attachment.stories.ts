import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nAttachment from './Attachment.vue';

const meta = {
	title: 'Experimental/Attachment',
	component: N8nAttachment,
	args: {
		isRemovable: true,
		onRemove: function onRemove() {
			window.alert('Remove attachment');
		},
		fileName: 'image.jpg',
		mimeType: 'image/jpeg',
		src: 'https://picsum.photos/seed/attachment/300/300',
	},
	render: function renderAttachment(args) {
		return {
			components: { N8nAttachment },
			setup() {
				return { args };
			},
			template: '<N8nAttachment v-bind="args" style="width: var(--height--4xl)" />',
		};
	},
} satisfies Meta<typeof N8nAttachment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFileLink: Story = {
	args: {
		href: 'https://picsum.photos/seed/attachment/1200/1200',
	},
};

export const NotRemovable: Story = {
	args: { isRemovable: false },
};

export const LongPdfFileName: Story = {
	args: {
		fileName: 'quarterly-financial-report-final-version12.pdf',
		mimeType: 'application/pdf',
		src: undefined,
	},
};

export const LongMarkdownFileName: Story = {
	args: {
		fileName: 'workflow-setup-and-configuration-instructions.md',
		mimeType: 'text/markdown',
		src: undefined,
	},
};

export const LongFileNameWithoutExtension: Story = {
	args: {
		fileName: 'workflow-export-without-a-file-extension',
		mimeType: 'application/octet-stream',
		src: undefined,
	},
};

export const LongFileExtension: Story = {
	args: {
		fileName: 'workflow-backup-final-version12.longextension',
		mimeType: 'application/octet-stream',
		src: undefined,
	},
};
