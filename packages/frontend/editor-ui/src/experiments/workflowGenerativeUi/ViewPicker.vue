<script setup lang="ts">
import { N8nButton, N8nInput, N8nOption, N8nSelect, N8nSwitch2 } from '@n8n/design-system';
import { ref, watch } from 'vue';
import {
	useWorkflowGenerativeUiStore,
	type WorkflowGenerativeUiView,
} from './workflowGenerativeUi.store';

const store = useWorkflowGenerativeUiStore();
const apiKeyDraft = ref(store.apiKey ?? '');

watch(
	() => store.apiKey,
	(apiKey) => {
		apiKeyDraft.value = apiKey ?? '';
	},
);

function isView(value: unknown): value is WorkflowGenerativeUiView {
	return value === 'canvas' || value === 'story' || value === 'play';
}

function selectView(value: unknown) {
	if (isView(value)) void store.setView(value);
}

function saveApiKey() {
	store.apiKey = apiKeyDraft.value.trim();
	if (store.apiKey) void store.regenerate();
}
</script>

<template>
	<div :class="$style.picker" data-testid="generative-ui-picker">
		<div :class="$style.controls">
			<N8nSelect
				:model-value="store.view"
				size="small"
				aria-label="Workflow view"
				data-testid="generative-ui-view"
				@update:model-value="selectView"
			>
				<N8nOption label="Canvas" value="canvas" />
				<N8nOption label="Story" value="story" />
				<N8nOption label="Play-by-play" value="play" />
			</N8nSelect>
			<N8nSwitch2 v-model="store.lookOnly" label="Look only" />
			<template v-if="store.view !== 'canvas'">
				<N8nButton
					size="small"
					variant="subtle"
					:loading="store.isGenerating"
					:disabled="store.isGenerating"
					data-testid="generative-ui-regenerate"
					@click="store.regenerate"
				>
					{{ store.isGenerating ? 'Regenerating…' : 'Regenerate' }}
				</N8nButton>
				<N8nButton
					size="small"
					variant="ghost"
					:disabled="!store.canUndo || store.isGenerating"
					data-testid="generative-ui-undo"
					@click="store.undo"
				>
					Undo
				</N8nButton>
			</template>
		</div>
		<form
			v-if="store.error === 'missing-key' || store.error === 'unauthorized'"
			:class="$style.apiKey"
			data-testid="generative-ui-api-key"
			@submit.prevent="saveApiKey"
		>
			<N8nInput
				v-model="apiKeyDraft"
				type="password"
				size="small"
				placeholder="Anthropic API key"
				aria-label="Anthropic API key"
			/>
			<N8nButton size="small" type="submit" :disabled="!apiKeyDraft.trim()">Save</N8nButton>
		</form>
	</div>
</template>

<style lang="scss" module>
.picker {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	z-index: 3;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--sm);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
}

.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	:global(.n8n-select) {
		min-width: calc(var(--spacing--5xl) / 2);
	}
}

.apiKey {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
