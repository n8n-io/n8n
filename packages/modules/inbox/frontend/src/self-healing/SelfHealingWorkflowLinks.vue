<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{ workflows: ReadonlyArray<{ workflowId: string; name: string }> }>();

const emit = defineEmits<{ select: [workflowId: string] }>();

const i18n = useI18n();

const parts = computed(() => {
	const names = new Map(props.workflows.map(({ workflowId, name }) => [workflowId, name]));
	return new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' })
		.formatToParts(props.workflows.map(({ workflowId }) => workflowId))
		.map((part): { workflowId?: string; text: string } =>
			part.type === 'element'
				? { workflowId: part.value, text: names.get(part.value) ?? part.value }
				: { text: part.value },
		);
});
</script>

<template>
	<span>
		<template v-for="(part, index) in parts" :key="index"
			><button
				v-if="part.workflowId"
				type="button"
				:class="$style.link"
				data-test-id="self-healing-changes-workflow-link"
				@click="part.workflowId && emit('select', part.workflowId)"
			>
				{{ part.text }}</button
			><template v-else>{{ part.text }}</template></template
		>
	</span>
</template>

<style module lang="scss">
.link {
	padding: 0;
	border: none;
	background: none;
	color: inherit;
	font: inherit;
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
