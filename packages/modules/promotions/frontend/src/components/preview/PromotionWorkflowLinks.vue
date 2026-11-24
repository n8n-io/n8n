<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ResourceKey } from '../../promotionPreview.selection';

/** A list of workflow names. A click on a name opens the workflow's change card. */
const props = defineProps<{
	workflows: ReadonlyArray<{ key: ResourceKey; name: string }>;
	/** One name per line, for a table cell. Otherwise the names form a sentence. */
	list?: boolean;
	/** The names are text, for a page that does not open a change card. */
	plain?: boolean;
}>();

const emit = defineEmits<{ inspect: [key: ResourceKey] }>();

const i18n = useI18n();

// The list format adds the separators and the "and" of the current language.
const parts = computed(() => {
	const names = new Map(props.workflows.map(({ key, name }) => [key, name]));
	return new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' })
		.formatToParts(props.workflows.map(({ key }) => key))
		.map((part): { key?: ResourceKey; text: string } =>
			part.type === 'element'
				? { key: part.value, text: names.get(part.value) ?? part.value }
				: { text: part.value },
		);
});
</script>

<template>
	<span v-if="list" :class="$style.list">
		<template v-for="workflow in workflows" :key="workflow.key">
			<span v-if="plain" data-test-id="promotion-preview-workflow-name">{{ workflow.name }}</span>
			<button
				v-else
				type="button"
				:class="$style.link"
				data-test-id="promotion-preview-workflow-link"
				@click="emit('inspect', workflow.key)"
			>
				{{ workflow.name }}
			</button>
		</template>
	</span>
	<span v-else>
		<template v-for="(part, index) in parts" :key="index"
			><button
				v-if="part.key && !plain"
				type="button"
				:class="$style.link"
				data-test-id="promotion-preview-workflow-link"
				@click="part.key && emit('inspect', part.key)"
			>
				{{ part.text }}</button
			><template v-else>{{ part.text }}</template></template
		>
	</span>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
}

/* N8nLink has no light theme, so the names use the color of the text around them. */
.link {
	padding: 0;
	border: none;
	background: none;
	color: inherit;
	font: inherit;
	text-align: inherit;
	text-decoration: underline;
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
	}
}
</style>
