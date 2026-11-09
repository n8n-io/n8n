<script setup lang="ts">
import { N8nHeading } from '@n8n/design-system';
import { nextTick, ref, useTemplateRef } from 'vue';

import { prototypeSession, renamePrototypeItem } from './prototype.session';

const props = defineProps<{
	itemId: string;
	text: string;
	testId?: string;
}>();

const editing = ref(false);
const draft = ref('');
const input = useTemplateRef<HTMLInputElement>('input');

async function start() {
	if (!prototypeSession.active) return;
	draft.value = props.text;
	editing.value = true;
	await nextTick();
	input.value?.focus();
	input.value?.select();
}

function save() {
	if (!editing.value) return;
	editing.value = false;
	renamePrototypeItem(props.itemId, draft.value);
}

function cancel() {
	editing.value = false;
}
</script>

<template>
	<input
		v-if="editing"
		ref="input"
		v-model="draft"
		:class="$style.input"
		:data-test-id="testId ?? 'inbox-prototype-title-input'"
		@keydown.enter.prevent="save"
		@keydown.escape="cancel"
		@blur="save"
	/>
	<button
		v-else-if="prototypeSession.active"
		type="button"
		:class="$style.button"
		data-test-id="inbox-prototype-title"
		@click="start"
	>
		<N8nHeading bold tag="h2" size="xlarge" :data-test-id="testId">{{ text }}</N8nHeading>
	</button>
	<N8nHeading v-else bold tag="h2" size="xlarge" :data-test-id="testId">{{ text }}</N8nHeading>
</template>

<style module lang="scss">
.button {
	flex: 1;
	min-width: 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	text-align: start;
	cursor: text;
}

.input {
	flex: 1;
	width: 100%;
	min-width: 0;
	margin: 0;
	padding: 0 0 var(--spacing--5xs);
	border: 0;
	border-bottom: var(--border);
	border-radius: 0;
	background: transparent;
	color: var(--color--text);
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--xl);
	line-height: var(--line-height--sm);
}
</style>
