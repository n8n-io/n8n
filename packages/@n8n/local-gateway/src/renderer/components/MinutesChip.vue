<script setup lang="ts">
import { nextTick, ref } from 'vue';

import { formatMinutes } from '../assistant/format';

const props = defineProps<{ minutes: number }>();
const emit = defineEmits<{ change: [minutes: number] }>();

const editing = ref(false);
const draft = ref(String(props.minutes));
const input = ref<HTMLInputElement | null>(null);

async function startEditing() {
	draft.value = String(props.minutes);
	editing.value = true;
	await nextTick();
	input.value?.focus();
	input.value?.select();
}

// Commit only a finite, positive value; otherwise revert to the current minutes.
function commit() {
	editing.value = false;
	const parsed = Number.parseInt(draft.value, 10);
	emit('change', Number.isFinite(parsed) && parsed > 0 ? parsed : props.minutes);
}

function cancel() {
	editing.value = false;
	draft.value = String(props.minutes);
}
</script>

<template>
	<input
		v-if="editing"
		ref="input"
		v-model="draft"
		type="number"
		:class="$style.edit"
		@blur="commit"
		@keydown.enter="commit"
		@keydown.escape.stop.prevent="cancel"
	/>
	<button v-else type="button" :class="$style.chip" @click="startEditing">
		{{ formatMinutes(props.minutes) }}
	</button>
</template>

<style module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 1px 7px;
	font: inherit;
	font-size: 12px;
	color: var(--da-text);
	vertical-align: baseline;
	cursor: pointer;
	background: var(--da-surface-2);
	border: 1px solid var(--da-border-strong);
	border-radius: var(--radius--2xs);
}

.chip:hover {
	background: var(--da-surface);
	border-color: var(--da-subtlest);
}

.edit {
	width: 46px;
	padding: 1px var(--spacing--3xs);
	font: inherit;
	font-size: 12px;
	color: var(--da-text);
	background: var(--da-surface-2);
	border: 1px solid var(--da-subtlest);
	border-radius: var(--radius--2xs);
	outline: none;
	box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
}
</style>
