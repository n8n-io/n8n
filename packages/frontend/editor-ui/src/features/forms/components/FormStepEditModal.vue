<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { FORM_STEP_EDIT_MODAL_KEY } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

const props = defineProps<{
	data: Record<string, unknown>;
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();

const node = computed(() =>
	workflowsStore.workflow.nodes.find((n) => n.id === (props.data?.nodeId as string)),
);

const title = computed(() => node.value?.name ?? i18n.baseText('formStep.editForm'));
</script>

<template>
	<Modal :name="FORM_STEP_EDIT_MODAL_KEY" :title="title" width="80%" height="90%" />
</template>
