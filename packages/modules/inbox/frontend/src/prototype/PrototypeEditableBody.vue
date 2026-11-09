<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue';

import { prototypeSession, setPrototypeDescription } from './prototype.session';

const props = defineProps<{
	itemId: string;
	text: string;
	testId?: string;
}>();

const editing = ref(false);
const draft = ref('');
const input = useTemplateRef<HTMLTextAreaElement>('input');

async function start() {
	if (!prototypeSession.active) return;
	draft.value = props.text;
	editing.value = true;
	await nextTick();
	input.value?.focus();
}

function save() {
	if (!editing.value) return;
	editing.value = false;
	setPrototypeDescription(props.itemId, draft.value);
}

function cancel() {
	editing.value = false;
}
</script>

<template>
	<textarea
		v-if="editing"
		ref="input"
		v-model="draft"
		:class="$style.input"
		:data-test-id="testId ?? 'inbox-prototype-body-input'"
		@keydown.escape="cancel"
		@blur="save"
	/>
	<button
		v-else-if="prototypeSession.active"
		type="button"
		:class="$style.button"
		data-test-id="inbox-prototype-body"
		@click="start"
	>
		<slot />
	</button>
	<slot v-else />
</template>

<style module lang="scss">
.button {
	display: block;
	width: 100%;
	margin: 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: start;
	cursor: text;
}

.input {
	width: 100%;
	min-height: calc(var(--spacing--4xl) - var(--spacing--lg));
	margin: 0;
	padding: 0;
	border: 0;
	border-bottom: var(--border);
	border-radius: 0;
	background: transparent;
	color: var(--color--text);
	font: inherit;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	resize: vertical;
}
</style>
