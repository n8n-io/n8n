<script setup lang="ts">
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nText } from '@n8n/design-system';

defineProps<{
	modalName: string;
}>();

const i18n = useI18n();
const modalBus = createEventBus();

const closeModal = () => {
	modalBus.emit('close');
};
</script>

<template>
	<Modal width="460px" :name="modalName" :event-bus="modalBus">
		<template #header>
			<N8nText tag="h2" size="xlarge">{{ i18n.baseText('ce.testExtension.modal.title') }}</N8nText>
		</template>
		<template #content>
			<N8nText>{{ i18n.baseText('ce.testExtension.modal.content') }}</N8nText>
		</template>
		<template #footer>
			<N8nButton type="primary" @click="closeModal">
				{{ i18n.baseText('ce.testExtension.modal.close') }}
			</N8nButton>
		</template>
	</Modal>
</template>
