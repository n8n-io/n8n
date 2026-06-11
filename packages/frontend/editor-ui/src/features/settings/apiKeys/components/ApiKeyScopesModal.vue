<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { ApiKey } from '@n8n/api-types';
import { N8nDialog, N8nText } from '@n8n/design-system';

const props = defineProps<{
	apiKey: ApiKey | null;
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();

const title = computed(() =>
	props.apiKey
		? i18n.baseText('settings.api.scopes.modal.title', {
				interpolate: { label: props.apiKey.label },
			})
		: '',
);

const scopes = computed(() => props.apiKey?.scopes ?? []);
</script>

<template>
	<N8nDialog
		:model-value="open"
		:title="title"
		width="480px"
		data-test-id="api-key-scopes-modal"
		@update:model-value="emit('update:open', $event)"
	>
		<div :class="$style.body">
			<N8nText v-if="!scopes.length" size="small" color="text-light">
				{{ i18n.baseText('settings.api.scopes.modal.empty') }}
			</N8nText>
			<ul v-else :class="$style.pills">
				<li v-for="scope in scopes" :key="scope" :class="$style.pill">
					{{ scope }}
				</li>
			</ul>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: 50vh;
	overflow-y: auto;
}

.pills {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.pill {
	background-color: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}
</style>
