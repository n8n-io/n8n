<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import Modal from '@/components/Modal.vue';
import { ref } from 'vue';
import JsonEditor from './JsonEditor/JsonEditor.vue';
import toJsonSchema from 'generate-schema';
import { jsonParse } from 'n8n-workflow';
import { createEventBus } from 'n8n-design-system/utils';
import { useToast } from '@/composables/useToast';
const props = defineProps<{
	modalName: string;
	data: { onGenerated: (schema: string) => void };
}>();
const modelValueString = ref('');
const i18n = useI18n();
const modalEventBus = createEventBus();
const toast = useToast();

function generateSchema() {
	const schema = toJsonSchema.json('', jsonParse(modelValueString.value)) ?? {};

	delete schema.title;
	props.data.onGenerated(JSON.stringify(schema, null, 2));

	toast.showMessage({
		title: i18n.baseText('generateJsonSchemaModal.success.title'),
		message: i18n.baseText('generateJsonSchemaModal.success.message'),
		type: 'success',
	});
	modalEventBus.emit('close');
}
</script>

<template>
	<Modal
		width="500px"
		:title="i18n.baseText('generateJsonSchemaModal.title')"
		:name="props.modalName"
		:event-bus="modalEventBus"
		:show-close="true"
	>
		<template #header>
			{{ i18n.baseText('generateJsonSchemaModal.title') }}
			<N8nNotice
				:class="$style.notice"
				theme="info"
				:content="i18n.baseText('generateJsonSchemaModal.notice.content')"
			/>
		</template>
		<template #content>
			<JsonEditor
				:model-value="modelValueString"
				:is-read-only="false"
				:rows="10"
				@update:model-value="(s) => (modelValueString = s)"
			/>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<n8n-button @click="generateSchema">{{
					i18n.baseText('generateJsonSchemaModal.button.label')
				}}</n8n-button>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}
</style>
