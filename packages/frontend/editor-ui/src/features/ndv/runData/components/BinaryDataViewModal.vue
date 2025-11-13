<script setup lang="ts">
import { computed } from 'vue';
import type { IBinaryData } from 'n8n-workflow';
import Modal from '@/app/components/Modal.vue';
import BinaryDataDisplayEmbed from './BinaryDataDisplayEmbed.vue';
import { BINARY_DATA_VIEW_MODAL_KEY } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import type { BinaryMetadata } from '@/Interface';

const i18n = useI18n();

const props = defineProps<{
	data?: {
		binaryData?: BinaryMetadata;
	};
}>();

const binaryDataForDisplay = computed<IBinaryData | null>(() => {
	if (!props.data?.binaryData) {
		return null;
	}

	const { id, mimeType, fileName } = props.data.binaryData;
	let fileType = props.data.binaryData.fileType;

	if (!fileType && mimeType) {
		if (mimeType.startsWith('image/')) fileType = 'image';
		else if (mimeType.startsWith('audio/')) fileType = 'audio';
		else if (mimeType.startsWith('video/')) fileType = 'video';
		else if (mimeType === 'application/pdf') fileType = 'pdf';
		else if (mimeType === 'application/json' || mimeType === 'text/json') fileType = 'json';
		else if (mimeType === 'text/html') fileType = 'html';
		else if (mimeType === 'text/plain') fileType = 'text';
	}

	return {
		id,
		mimeType,
		fileName,
		fileType,
		data: '',
	} as IBinaryData;
});
</script>

<template>
	<Modal
		width="80%"
		height="80%"
		title="Binary Data"
		:name="BINARY_DATA_VIEW_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="['binary-data-modal-content', binaryDataForDisplay?.fileType]">
				<div v-if="!binaryDataForDisplay" class="no-data-message">
					{{ i18n.baseText('binaryDataDisplay.noDataFoundToDisplay') }}
				</div>
				<BinaryDataDisplayEmbed v-else :binary-data="binaryDataForDisplay" />
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" scoped>
.binary-data-modal-content {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;

	&.json {
		overflow: auto;
	}

	.no-data-message {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--color--text--shade-1);
	}
}
</style>
