<script setup lang="ts">
import { computed, watch } from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { useFrontendBuilder } from '../composables/useFrontendBuilder';
import FrontendBuilderIframe from './FrontendBuilderIframe.vue';
import FrontendBuilderMessageList from './FrontendBuilderMessageList.vue';
import FrontendBuilderPromptInput from './FrontendBuilderPromptInput.vue';

const props = defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>();

const { messages, demoUrl, sending, hydrating, error, hydrate, send, clear } = useFrontendBuilder();

async function onClear() {
	const confirmed = window.confirm(
		'Clear the chat and start a new one? The frontend preview will be reset.',
	);
	if (!confirmed) return;
	await clear();
}
const workflowDocumentStore = injectWorkflowDocumentStore();

const showActivationWarning = computed(() => workflowDocumentStore?.value?.active === false);

watch(
	() => props.open,
	(open) => {
		if (open) void hydrate();
	},
	{ immediate: true },
);
</script>

<template>
	<aside v-if="open" :class="$style.drawer" data-testid="frontend-builder-drawer">
		<header :class="$style.header">
			<h2 :class="$style.title">Frontend</h2>
			<div :class="$style.headerActions">
				<button
					v-if="messages.length > 0"
					:class="$style.clearButton"
					type="button"
					data-testid="frontend-builder-clear"
					@click="onClear"
				>
					Clear
				</button>
				<button :class="$style.closeButton" type="button" @click="$emit('close')">×</button>
			</div>
		</header>
		<section :class="$style.body">
			<p v-if="showActivationWarning" :class="$style.warning">
				This workflow doesn't appear to be published. The generated frontend may not be able to
				reach your webhooks. Publish the workflow if it isn't already.
			</p>
			<FrontendBuilderMessageList :messages="messages" />
			<p v-if="error" :class="$style.error">{{ error }}</p>
			<FrontendBuilderIframe :demo-url="demoUrl" :has-messages="messages.length > 0" />
			<FrontendBuilderPromptInput :disabled="sending || hydrating" @send="send" />
		</section>
	</aside>
</template>

<style module>
.drawer {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 560px;
	background: var(--color--background);
	border-left: var(--border);
	display: flex;
	flex-direction: column;
	z-index: 100;
}
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm);
	border-bottom: var(--border);
}
.title {
	margin: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
}
.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
.clearButton {
	background: transparent;
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-size: var(--font-size--xs);
	cursor: pointer;
	color: var(--color--text--tint-1);
}
.clearButton:hover {
	color: var(--color--text);
}
.closeButton {
	background: transparent;
	border: 0;
	font-size: var(--font-size--lg);
	cursor: pointer;
	color: var(--color--text);
}
.body {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
}
.error {
	color: var(--color--danger);
	padding: 0 var(--spacing--sm);
	margin: 0 0 var(--spacing--xs);
}
.warning {
	color: var(--color--warning--shade-1);
	background: var(--color--warning--tint-2);
	padding: var(--spacing--2xs) var(--spacing--sm);
	margin: 0;
	font-size: var(--font-size--xs);
}
</style>
