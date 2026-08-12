<script setup lang="ts">
import {
	N8nDialog,
	N8nDialogDescription,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInput,
	N8nText,
} from '@n8n/design-system';

import type { EligibleWorkflow, WebhookTarget } from '../composables/useWebhookTargets';

/**
 * Reaching past the workflow being edited.
 *
 * A dialog rather than more of the dropdown: it is a detour off one field, it
 * ends in a choice, and the builder should still be behind it when it closes.
 */
defineOptions({ name: 'TriggerPickerDialog' });

defineProps<{
	open: boolean;
	query: string;
	loading: boolean;
	results: EligibleWorkflow[];
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	'update:query': [query: string];
	pick: [target: WebhookTarget];
}>();

function pathOf(url: string): string {
	return url.split('/').filter(Boolean).pop() ?? url;
}
</script>

<template>
	<N8nDialog :open="open" size="large" @update:open="emit('update:open', $event)">
		<N8nDialogHeader>
			<N8nDialogTitle>Pick a webhook trigger</N8nDialogTitle>
			<N8nDialogDescription>
				Triggers in your other workflows. The action posts to the production URL, so that workflow
				has to be active for this to answer.
			</N8nDialogDescription>
		</N8nDialogHeader>

		<div class="ui-picker">
			<N8nInput
				:model-value="query"
				size="small"
				clearable
				placeholder="Filter by workflow or path"
				@update:model-value="emit('update:query', $event)"
			/>

			<div class="ui-picker__body">
				<N8nText v-if="loading" size="small" color="text-light">Looking…</N8nText>

				<N8nText v-else-if="results.length === 0" size="small" color="text-light">
					{{ query ? 'No trigger matches that.' : 'No other workflow has a Webhook trigger in it.' }}
				</N8nText>

				<template v-for="workflow in results" :key="workflow.id">
					<div class="ui-picker__group">
						<span>{{ workflow.name }}</span>
						<span v-if="!workflow.active" class="ui-picker__inactive">inactive</span>
					</div>

					<button
						v-for="trigger in workflow.triggers"
						:key="trigger.url"
						type="button"
						class="ui-picker__row"
						@click="emit('pick', trigger)"
					>
						{{ pathOf(trigger.url) }}
					</button>
				</template>
			</div>
		</div>
	</N8nDialog>
</template>

<style scoped>
.ui-picker {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
}

/*
 * Capped rather than grown to fit: a busy instance would otherwise push the
 * dialog taller than the viewport, and the list is what should scroll.
 */
.ui-picker__body {
	max-height: 50dvh;
	overflow-y: auto;
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--3xs) 0;
}

.ui-picker__group {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--5xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.ui-picker__inactive {
	color: var(--color--warning);
}

.ui-picker__row {
	display: block;
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--sm);
	border: none;
	background: none;
	color: inherit;
	font-size: var(--font-size--2xs);
	text-align: left;
	cursor: pointer;
}

.ui-picker__row:hover,
.ui-picker__row:focus-visible {
	background-color: var(--background--hover);
}
</style>
