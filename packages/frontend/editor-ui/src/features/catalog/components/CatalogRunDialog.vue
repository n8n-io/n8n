<script setup lang="ts">
import { N8nButton, N8nDialog, N8nDialogFooter, N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';

import type { CatalogEntry } from '@/features/catalog/catalog.types';

const props = defineProps<{
	entry: CatalogEntry;
	running: boolean;
}>();

const emit = defineEmits<{
	close: [];
	submit: [inputs: Record<string, string>];
}>();

const i18n = useI18n();

const inputs = ref<Record<string, string>>({});

watch(
	() => props.entry,
	(entry) => {
		// Start each form clean rather than carrying the previous workflow's values.
		inputs.value = Object.fromEntries(entry.fields.map((field) => [field.name, '']));
	},
	{ immediate: true },
);

const close = () => {
	if (props.running) return;
	emit('close');
};
</script>

<template>
	<N8nDialog
		:open="true"
		size="medium"
		:header="entry.name"
		:description="i18n.baseText('catalog.form.description')"
		@update:open="close"
	>
		<form
			:class="$style.form"
			data-test-id="catalog-run-dialog"
			@submit.prevent="emit('submit', { ...inputs })"
		>
			<N8nInputLabel
				v-for="field in entry.fields"
				:key="field.name"
				:input-name="`catalog-input-${field.name}`"
				:label="field.name"
			>
				<N8nInput
					:id="`catalog-input-${field.name}`"
					v-model="inputs[field.name]"
					:name="field.name"
					:placeholder="field.type"
				/>
			</N8nInputLabel>

			<N8nDialogFooter>
				<N8nButton type="button" variant="outline" :disabled="running" @click="close">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="submit" :loading="running" data-test-id="catalog-run-submit">
					{{ i18n.baseText('catalog.run') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}
</style>
