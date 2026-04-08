<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nText } from '@n8n/design-system';
import { createEventBus } from '@n8n/utils/event-bus';
import { ref } from 'vue';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useNodeNameSuggestions } from '@/features/ai/nodeNameSuggestions/useNodeNameSuggestions';
import type { AiNodeNameSuggestion } from '@n8n/api-types';

const props = defineProps<{
	modalName: string;
	data: {
		suggestions: AiNodeNameSuggestion[];
	};
}>();

const i18n = useI18n();
const modalBus = createEventBus();
const canvasOperations = useCanvasOperations();
const { cacheRenamedNode } = useNodeNameSuggestions();
const appliedNames = ref<Set<string>>(new Set());
const skippedNames = ref<Set<string>>(new Set());

async function applyRename(currentName: string, suggestedName: string) {
	const result = await canvasOperations.renameNode(currentName, suggestedName, {
		trackHistory: true,
	});
	if (result !== false) {
		appliedNames.value = new Set([...appliedNames.value, currentName]);
		cacheRenamedNode(suggestedName);
	}
}

function skipSuggestion(currentName: string) {
	skippedNames.value = new Set([...skippedNames.value, currentName]);
}

async function applyAll() {
	for (const suggestion of props.data.suggestions) {
		if (
			!appliedNames.value.has(suggestion.currentName) &&
			!skippedNames.value.has(suggestion.currentName)
		) {
			await applyRename(suggestion.currentName, suggestion.suggestedName);
		}
	}
	modalBus.emit('close');
}

function dismiss() {
	modalBus.emit('close');
}

function isProcessed(name: string) {
	return appliedNames.value.has(name) || skippedNames.value.has(name);
}
</script>

<template>
	<Modal
		:name="props.modalName"
		:event-bus="modalBus"
		:title="i18n.baseText('aiNodeNames.modal.title')"
		width="560px"
	>
		<template #content>
			<div :class="$style.list">
				<div
					v-for="suggestion in props.data.suggestions"
					:key="suggestion.currentName"
					:class="[$style.row, { [$style.processed]: isProcessed(suggestion.currentName) }]"
				>
					<div :class="$style.nameRow">
						<N8nText bold>{{ suggestion.currentName }}</N8nText>
						<N8nText color="text-light">&rarr;</N8nText>
						<N8nText bold color="primary">{{ suggestion.suggestedName }}</N8nText>
					</div>
					<N8nText v-if="suggestion.reason" size="small" color="text-light">
						{{ suggestion.reason }}
					</N8nText>
					<div v-if="!isProcessed(suggestion.currentName)" :class="$style.actions">
						<N8nButton
							size="small"
							type="primary"
							data-testid="apply-suggestion"
							@click="applyRename(suggestion.currentName, suggestion.suggestedName)"
						>
							{{ i18n.baseText('aiNodeNames.modal.accept') }}
						</N8nButton>
						<N8nButton
							size="small"
							type="tertiary"
							data-testid="skip-suggestion"
							@click="skipSuggestion(suggestion.currentName)"
						>
							{{ i18n.baseText('aiNodeNames.modal.skip') }}
						</N8nButton>
					</div>
					<div v-else :class="$style.status">
						<N8nText v-if="appliedNames.has(suggestion.currentName)" color="success">
							&#10003;
						</N8nText>
						<N8nText v-else color="text-light">
							{{ i18n.baseText('aiNodeNames.modal.skipped') }}
						</N8nText>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="tertiary" data-testid="dismiss-suggestions" @click="dismiss">
					{{ i18n.baseText('aiNodeNames.modal.dismiss') }}
				</N8nButton>
				<N8nButton type="primary" data-testid="apply-all-suggestions" @click="applyAll">
					{{ i18n.baseText('aiNodeNames.modal.acceptAll') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	max-height: 60vh;
	overflow-y: auto;
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border-radius: var(--radius);
	border: var(--border);

	&.processed {
		opacity: 0.6;
	}
}

.nameRow {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--4xs);
}

.status {
	margin-top: var(--spacing--4xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
