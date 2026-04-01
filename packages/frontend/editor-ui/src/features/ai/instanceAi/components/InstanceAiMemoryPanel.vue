<script lang="ts" setup>
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiMemoryStore } from '../instanceAiMemory.store';

const emit = defineEmits<{ close: [] }>();
const i18n = useI18n();
const store = useInstanceAiStore();
const memoryStore = useInstanceAiMemoryStore();

// Track which thread was fetched to prevent saving stale data to the wrong thread
const fetchedThreadId = ref(store.currentThreadId);

watch(
	() => store.currentThreadId,
	(threadId) => {
		fetchedThreadId.value = threadId;
		void memoryStore.fetch(threadId);
	},
	{ immediate: true },
);

function handleSave() {
	void memoryStore.save(fetchedThreadId.value);
}
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="brain" size="small" />
				<span>{{ i18n.baseText('instanceAi.memory.title') }}</span>
			</div>
			<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
		</div>
		<div :class="$style.body">
			<div v-if="memoryStore.isLoading" :class="$style.loading">
				<N8nIcon icon="spinner" color="primary" spin />
			</div>
			<textarea
				v-else
				v-model="memoryStore.content"
				:class="$style.textarea"
				:placeholder="i18n.baseText('instanceAi.memory.placeholder')"
			/>
		</div>
		<div :class="$style.footer">
			<button
				:class="$style.resetButton"
				:disabled="memoryStore.isLoading"
				@click="memoryStore.resetToTemplate()"
			>
				{{ i18n.baseText('instanceAi.memory.resetToTemplate') }}
			</button>
			<button
				:class="$style.saveButton"
				:disabled="!memoryStore.isDirty || memoryStore.isLoading"
				@click="handleSave"
			>
				{{ i18n.baseText('instanceAi.memory.save') }}
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 360px;
	background: var(--color--background);
	border-left: var(--border);
	display: flex;
	flex-direction: column;
	z-index: 10;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.body {
	flex: 1;
	overflow: hidden;
	padding: var(--spacing--xs);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
}

.textarea {
	width: 100%;
	height: 100%;
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--xs);
	font-family: monospace;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	resize: none;
	color: var(--color--text);
	background: var(--color--background);

	&:focus {
		outline: 2px solid var(--color--primary);
		outline-offset: -1px;
	}
}

.footer {
	display: flex;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}

.resetButton {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text--tint-1);

	&:hover:not(:disabled) {
		background: var(--color--background--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.saveButton {
	padding: var(--spacing--4xs) var(--spacing--sm);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: none;
	background: var(--color--primary);
	color: var(--button--color--text--primary);

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}
</style>
