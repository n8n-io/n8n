<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { N8nHeading, N8nText, N8nButton } from '@n8n/design-system';
import { WORKFLOW_HISTORY_PUBLISH_MODAL_KEY } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';

const props = defineProps<{
	modalName: string;
	data: { versionId: string; workflowId: string; formattedCreatedAt: string };
}>();

const i18n = useI18n();
const eventBus = createEventBus();

const handlePublish = () => {
	// TODO: implement publish logic
	eventBus.emit('close');
};
</script>

<template>
	<Modal width="500px" :name="WORKFLOW_HISTORY_PUBLISH_MODAL_KEY" :event-bus="eventBus">
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{
					i18n.baseText('workflowHistory.publishModal.title', {
						interpolate: { versionName: props.data.formattedCreatedAt },
					})
				}}
			</N8nHeading>
		</template>
		<template #content>
			<N8nText> {{ i18n.baseText('workflowHistory.publishModal.description') }} </N8nText>
		</template>
		<template #footer>
			<div :class="$style.footerButtons">
				<N8nButton type="secondary" @click="eventBus.emit('close')">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="primary" @click="handlePublish">
					{{ i18n.baseText('workflows.publish') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>
<style lang="scss" module>
.footerButtons {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
