<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import {
	MCP_JSON_NUDGE_MODAL_KEY,
	type McpJsonNudgeSurface,
} from '@/experiments/mcpJsonNudge/constants';

const props = defineProps<{
	data: {
		surface: McpJsonNudgeSurface;
	};
}>();

const i18n = useI18n();

const title = computed(() =>
	props.data.surface === 'export'
		? i18n.baseText('experiments.mcpJsonNudge.modal.export.title')
		: i18n.baseText('experiments.mcpJsonNudge.modal.import.title'),
);
</script>

<template>
	<Modal :name="MCP_JSON_NUDGE_MODAL_KEY" :title="title" width="480px">
		<template #content>
			<N8nText color="text-base">
				{{ i18n.baseText('experiments.mcpJsonNudge.modal.placeholderBody') }}
			</N8nText>
		</template>
	</Modal>
</template>
