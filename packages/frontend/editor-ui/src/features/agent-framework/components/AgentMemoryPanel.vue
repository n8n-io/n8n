<script setup lang="ts">
import { computed } from 'vue';
import { N8nText, N8nButton } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import type { AgentSchema } from '../types';

const props = defineProps<{ schema: AgentSchema | null }>();
const emit = defineEmits<{ 'update:schema': [changes: Partial<AgentSchema>] }>();

const memory = computed(() => props.schema?.memory ?? null);
const isCustomStorage = computed(() => memory.value?.storage === 'custom');

function onLastMessagesChange(event: Event) {
	const value = Number((event.target as HTMLInputElement).value);
	if (value > 0 && memory.value)
		emit('update:schema', { memory: { ...memory.value, lastMessages: value } });
}

function onRemoveMemory() {
	emit('update:schema', { memory: null });
}

function onEnableMemory() {
	emit('update:schema', {
		memory: {
			source: null,
			storage: 'memory',
			lastMessages: 10,
			semanticRecall: null,
			workingMemory: null,
		},
	});
}

// Semantic recall — only available with custom (persistent) storage
function onSemanticRecallToggle(enabled: boolean) {
	if (!memory.value) return;
	if (enabled) {
		emit('update:schema', {
			memory: {
				...memory.value,
				semanticRecall: {
					topK: 10,
					messageRange: { before: 2, after: 2 },
					embedder: null,
				},
			},
		});
	} else {
		emit('update:schema', { memory: { ...memory.value, semanticRecall: null } });
	}
}

function onTopKChange(event: Event) {
	if (!memory.value?.semanticRecall) return;
	const value = Number((event.target as HTMLInputElement).value);
	if (!Number.isFinite(value) || value < 1) return;
	emit('update:schema', {
		memory: {
			...memory.value,
			semanticRecall: { ...memory.value.semanticRecall, topK: value },
		},
	});
}

function onRangeBeforeChange(event: Event) {
	if (!memory.value?.semanticRecall) return;
	const value = Number((event.target as HTMLInputElement).value);
	if (!Number.isFinite(value) || value < 0) return;
	const currentRange = memory.value.semanticRecall.messageRange;
	emit('update:schema', {
		memory: {
			...memory.value,
			semanticRecall: {
				...memory.value.semanticRecall,
				messageRange: { before: value, after: currentRange?.after ?? 2 },
			},
		},
	});
}

function onRangeAfterChange(event: Event) {
	if (!memory.value?.semanticRecall) return;
	const value = Number((event.target as HTMLInputElement).value);
	if (!Number.isFinite(value) || value < 0) return;
	const currentRange = memory.value.semanticRecall.messageRange;
	emit('update:schema', {
		memory: {
			...memory.value,
			semanticRecall: {
				...memory.value.semanticRecall,
				messageRange: { before: currentRange?.before ?? 2, after: value },
			},
		},
	});
}

const semanticRecallEnabled = computed(
	() => memory.value?.semanticRecall !== null && memory.value?.semanticRecall !== undefined,
);
</script>

<template>
	<div :class="$style.container">
		<!-- Configured state -->
		<template v-if="memory !== null">
			<div :class="$style.header">
				<N8nText tag="h3" size="large" :bold="true">Memory</N8nText>
				<N8nText size="small" color="text-light">Conversation memory configuration</N8nText>
			</div>

			<!-- Storage type -->
			<div :class="$style.row">
				<N8nText size="small" :bold="true">Storage</N8nText>
				<N8nText size="small">{{ isCustomStorage ? 'Custom (persistent)' : 'In-process' }}</N8nText>
			</div>

			<!-- Last messages -->
			<div :class="$style.row">
				<N8nText size="small" :bold="true">Last messages</N8nText>
				<input
					type="number"
					:value="memory.lastMessages ?? 10"
					min="1"
					:class="$style.inlineInput"
					@change="onLastMessagesChange"
				/>
			</div>

			<!-- Semantic recall — only for custom/persistent storage -->
			<template v-if="isCustomStorage">
				<hr :class="$style.divider" />

				<div :class="$style.row">
					<N8nText size="small" :bold="true">Semantic recall</N8nText>
					<ElSwitch
						:model-value="semanticRecallEnabled"
						@update:model-value="onSemanticRecallToggle"
					/>
				</div>

				<template v-if="semanticRecallEnabled && memory.semanticRecall">
					<div :class="$style.row">
						<N8nText size="small" :bold="true">Top K</N8nText>
						<input
							type="number"
							:value="memory.semanticRecall.topK"
							min="1"
							:class="$style.inlineInput"
							@change="onTopKChange"
						/>
					</div>
					<div :class="$style.row">
						<N8nText size="small" :bold="true">Range before</N8nText>
						<input
							type="number"
							:value="memory.semanticRecall.messageRange?.before ?? 2"
							min="0"
							:class="$style.inlineInput"
							@change="onRangeBeforeChange"
						/>
					</div>
					<div :class="$style.row">
						<N8nText size="small" :bold="true">Range after</N8nText>
						<input
							type="number"
							:value="memory.semanticRecall.messageRange?.after ?? 2"
							min="0"
							:class="$style.inlineInput"
							@change="onRangeAfterChange"
						/>
					</div>
					<div :class="$style.row">
						<N8nText size="small" :bold="true">Embedder</N8nText>
						<N8nText
							size="small"
							:color="memory.semanticRecall.embedder ? undefined : 'text-light'"
						>
							{{ memory.semanticRecall.embedder ?? 'Not configured' }}
						</N8nText>
					</div>
				</template>
			</template>

			<!-- Working memory -->
			<template v-if="memory.workingMemory">
				<hr :class="$style.divider" />

				<N8nText size="small" :bold="true" :class="$style.sectionLabel">Working Memory</N8nText>

				<div :class="$style.row">
					<N8nText size="small" :bold="true">Type</N8nText>
					<N8nText size="small">{{ memory.workingMemory.type }}</N8nText>
				</div>

				<template v-if="memory.workingMemory.type === 'structured' && memory.workingMemory.schema">
					<pre :class="$style.codeBlock">{{
						JSON.stringify(memory.workingMemory.schema, null, 2)
					}}</pre>
				</template>

				<template
					v-else-if="memory.workingMemory.type === 'freeform' && memory.workingMemory.template"
				>
					<pre :class="$style.codeBlock">{{ memory.workingMemory.template }}</pre>
				</template>
			</template>

			<hr :class="$style.divider" />

			<!-- Remove memory -->
			<N8nButton type="tertiary" size="small" @click="onRemoveMemory"> Remove memory </N8nButton>
		</template>

		<!-- Empty state -->
		<template v-else>
			<div :class="$style.emptyState">
				<div :class="$style.emptyCard">
					<N8nText tag="h3" size="large" :bold="true">No memory configured</N8nText>
					<N8nText size="small" color="text-light">
						Enable memory to give the agent conversation history across turns
					</N8nText>
					<N8nButton type="primary" @click="onEnableMemory">Enable Memory</N8nButton>
				</div>
			</div>
		</template>
	</div>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg);
	gap: var(--spacing--xs);
	width: 100%;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 32px;
}

.sectionLabel {
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.inlineInput {
	width: 70px;
	text-align: center;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-2);
	color: var(--color--text);
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	outline: none;
}

.inlineInput:focus {
	border-color: var(--color--primary);
}

.divider {
	border: none;
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	margin: var(--spacing--2xs) 0;
}

.codeBlock {
	font-family: var(--font-family--monospace, 'SF Mono', monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	background-color: var(--color--background--shade-1);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	padding: var(--spacing--xs);
	overflow-x: auto;
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	width: 100%;
	box-sizing: border-box;
}

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
	height: 100%;
}

.emptyCard {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xl);
	border: var(--border-width) dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	text-align: center;
	max-width: 360px;
}
</style>
