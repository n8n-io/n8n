<script setup lang="ts">
import { computed } from 'vue';
import { N8nText, N8nSelect, N8nSwitch } from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import type { AgentJsonConfig } from '../types';

type MemoryConfig = NonNullable<AgentJsonConfig['memory']>;
type StorageType = MemoryConfig['storage'];

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; embedded?: boolean }>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const memory = computed(() => (props.config?.memory?.enabled ? props.config.memory : null));

/** Persistent storage types that support semantic recall. */
const PERSISTENT_STORAGES: StorageType[] = ['sqlite', 'postgres'];

const isPersistentStorage = computed(
	() => memory.value !== null && PERSISTENT_STORAGES.includes(memory.value.storage),
);

const semanticRecallEnabled = computed(
	() => memory.value?.semanticRecall !== undefined && memory.value.semanticRecall !== null,
);

function patchMemory(patch: Partial<MemoryConfig>) {
	if (!memory.value) return;
	emit('update:config', { memory: { ...memory.value, ...patch } });
}

function onStorageChange(value: StorageType) {
	if (!memory.value) return;
	const updated: MemoryConfig = { ...memory.value, storage: value };
	// Clear semantic recall when switching to non-persistent storage
	if (!PERSISTENT_STORAGES.includes(value)) {
		updated.semanticRecall = undefined;
	}
	emit('update:config', { memory: updated });
}

function onLastMessagesChange(event: Event) {
	const value = Number((event.target as HTMLInputElement).value);
	if (value > 0) patchMemory({ lastMessages: value });
}

function onEnableMemory() {
	emit('update:config', {
		memory: { enabled: true, storage: 'n8n', lastMessages: 10 },
	});
}

function onDisableMemory() {
	emit('update:config', {
		memory: { ...(props.config?.memory ?? { storage: 'n8n' as const }), enabled: false },
	});
}

function onMemoryToggle(enabled: boolean) {
	if (enabled) {
		onEnableMemory();
	} else {
		onDisableMemory();
	}
}

function onSemanticRecallToggle(enabled: boolean) {
	if (!memory.value) return;
	if (enabled) {
		patchMemory({
			semanticRecall: {
				topK: 10,
				messageRange: { before: 2, after: 2 },
			},
		});
	} else {
		patchMemory({ semanticRecall: undefined });
	}
}

function onTopKChange(event: Event) {
	if (!memory.value?.semanticRecall) return;
	const value = Number((event.target as HTMLInputElement).value);
	if (!Number.isFinite(value) || value < 1) return;
	patchMemory({
		semanticRecall: { ...memory.value.semanticRecall, topK: value },
	});
}

function onRangeBeforeChange(event: Event) {
	if (!memory.value?.semanticRecall) return;
	const value = Number((event.target as HTMLInputElement).value);
	if (!Number.isFinite(value) || value < 0) return;
	const after = memory.value.semanticRecall.messageRange?.after ?? 2;
	patchMemory({
		semanticRecall: {
			...memory.value.semanticRecall,
			messageRange: { before: value, after },
		},
	});
}

function onRangeAfterChange(event: Event) {
	if (!memory.value?.semanticRecall) return;
	const value = Number((event.target as HTMLInputElement).value);
	if (!Number.isFinite(value) || value < 0) return;
	const before = memory.value.semanticRecall.messageRange?.before ?? 2;
	patchMemory({
		semanticRecall: {
			...memory.value.semanticRecall,
			messageRange: { before, after: value },
		},
	});
}
</script>

<template>
	<div
		:class="[$style.container, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
	>
		<div :class="$style.header">
			<N8nText tag="h3" :bold="true">Memory</N8nText>
			<N8nSwitch
				:model-value="memory !== null"
				:disabled="props.disabled"
				data-testid="agent-memory-toggle"
				@update:model-value="onMemoryToggle"
			/>
		</div>

		<!-- Configured + enabled state -->
		<template v-if="memory !== null">
			<!-- Storage type -->
			<div :class="$style.row">
				<N8nText size="small" :bold="true">Storage</N8nText>
				<N8nSelect
					:model-value="memory.storage"
					size="small"
					:class="$style.inlineSelect"
					data-testid="agent-memory-storage-select"
					@update:model-value="onStorageChange"
				>
					<N8nOption value="n8n" label="n8n" />
				</N8nSelect>
			</div>

			<!-- Last messages -->
			<div :class="$style.row">
				<N8nText size="small" :bold="true">Last messages</N8nText>
				<input
					type="number"
					:value="memory.lastMessages ?? 10"
					min="1"
					:class="$style.inlineInput"
					data-testid="agent-last-messages-input"
					@change="onLastMessagesChange"
				/>
			</div>

			<!-- Semantic recall — only for persistent storage -->
			<template v-if="isPersistentStorage">
				<hr :class="$style.divider" />

				<div :class="$style.row">
					<N8nText size="small" :bold="true">Semantic recall</N8nText>
					<N8nSwitch
						:model-value="semanticRecallEnabled"
						data-testid="agent-semantic-recall-toggle"
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
				</template>
			</template>
		</template>
	</div>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	height: 100%;
	overflow-y: auto;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

/* Scoped overlay — header stays interactive so the heading and toggle can render. */
.container.disabled > :not(.header) {
	pointer-events: none;
	opacity: 0.6;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: var(--spacing--xl);
}

.inlineInput {
	width: 70px;
	text-align: center;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--hover);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	outline: none;
}

.inlineInput:focus {
	border-color: var(--background--brand);
}

.inlineSelect {
	width: 160px;
}

.divider {
	border: none;
	border-top: var(--border);
	margin: var(--spacing--2xs) 0;
}
</style>
