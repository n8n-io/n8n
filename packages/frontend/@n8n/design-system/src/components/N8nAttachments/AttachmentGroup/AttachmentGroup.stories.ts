import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import type { AttachmentProps } from '../Attachment/Attachment.types';
import N8nAttachment from '../Attachment/Attachment.vue';
import N8nAttachmentGroup from './AttachmentGroup.vue';

const meta = {
	title: 'Experimental/AttachmentGroup',
	component: N8nAttachmentGroup,
} satisfies Meta<typeof N8nAttachmentGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

function useAttachments(initialAttachments: AttachmentProps[]) {
	const attachments = ref([...initialAttachments]);

	function onRemove(fileName: string) {
		attachments.value = attachments.value.filter((attachment) => attachment.fileName !== fileName);
	}

	return { attachments, onRemove };
}

const attachments: AttachmentProps[] = Array.from({ length: 8 }, (_, index) => ({
	fileName: `image-${index + 1}.jpg`,
	mimeType: 'image/jpeg',
	src: `https://picsum.photos/seed/attachment-${index + 1}/300/300`,
}));

attachments.splice(2, 0, {
	fileName: 'workflow-backup-with-all-project-files12.zip',
	mimeType: 'application/zip',
});
attachments.splice(5, 0, {
	fileName: 'video.mp4',
	mimeType: 'video/mp4',
	src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
});
attachments.splice(8, 0, {
	fileName: 'quarterly-financial-report-final-version12.pdf',
	mimeType: 'application/pdf',
});
attachments.splice(10, 0, {
	fileName: 'workflow-setup-and-configuration-instructions.md',
	mimeType: 'text/markdown',
});
attachments.push(
	{
		fileName: 'workflow-export-without-a-file-extension',
		mimeType: 'application/octet-stream',
	},
	{
		fileName: 'workflow-backup-final-version12.longextension',
		mimeType: 'application/octet-stream',
	},
);

export const Placeholders: Story = {
	render: function renderAttachments() {
		return {
			components: { N8nAttachment, N8nAttachmentGroup },
			setup() {
				return useAttachments(attachments);
			},
			template: `
				<N8nAttachmentGroup>
					<N8nAttachment
						v-for="attachment in attachments"
						:key="attachment.fileName"
						v-bind="attachment"
						:is-removable="true"
						@remove="onRemove(attachment.fileName)"
						style="width: var(--height--4xl)"
					/>
				</N8nAttachmentGroup>
			`,
		};
	},
};

export const Default: Story = {
	render: function renderGroup() {
		return {
			components: { N8nAttachment, N8nAttachmentGroup },
			setup() {
				return useAttachments(attachments.slice(0, 2));
			},
			template: `
				<N8nAttachmentGroup>
					<N8nAttachment
						v-for="attachment in attachments"
						:key="attachment.fileName"
						v-bind="attachment"
						:is-removable="true"
						@remove="onRemove(attachment.fileName)"
						style="width: var(--height--4xl)"
					/>
				</N8nAttachmentGroup>
			`,
		};
	},
};
