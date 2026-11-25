<script setup lang="ts">
import { computed, ref } from 'vue';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { N8nHoverCard, N8nIcon, N8nText } from '@n8n/design-system';

export interface DisplayMemory {
	id: string;
	keyMemory: string;
	evidence: string[];
}

const props = defineProps<{
	memories: DisplayMemory[];
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
}>();

const i18n = useI18n();

const memoriesCountLabelKey = 'agents.builder.quickActions.memoriesUsed.count' as BaseTextKey;
const keyMemoryLabelKey = 'agents.builder.quickActions.memoriesUsed.keyMemory' as BaseTextKey;

const memories = computed(() => props.memories);
const isOpen = ref(false);

function onOpenChange(open: boolean) {
	isOpen.value = open;
	emit('update:open', open);
}

function splitKeyMemory(text: string): string[] {
	return text.split(/(?<=[.!?])\s+/).filter((part) => part.length > 0);
}
</script>

<template>
	<N8nHoverCard
		v-if="memories.length > 0"
		v-model:open="isOpen"
		:open-delay="400"
		:close-delay="0"
		side="bottom"
		align="end"
		:side-offset="8"
		max-width="24rem"
		max-height="280px"
		enable-scrolling
		@update:open="onOpenChange"
	>
		<template #trigger>
			<div :class="$style.trigger">
				<N8nIcon icon="brain" size="small" />
				<span>
					{{
						i18n.baseText(memoriesCountLabelKey, {
							adjustToNumber: memories.length,
							interpolate: { count: String(memories.length) },
						})
					}}
				</span>
			</div>
		</template>
		<template #content>
			<div v-for="memory in memories" :key="memory.id" :class="$style.memorySection">
				<N8nText step="sm" bold :class="$style.label">
					{{ i18n.baseText(keyMemoryLabelKey) }}
				</N8nText>
				<ul :class="$style.keyMemoryList">
					<li
						v-for="(sentence, sentenceIndex) in splitKeyMemory(memory.keyMemory)"
						:key="`${memory.id}-${sentenceIndex}`"
					>
						<N8nText step="sm" tag="p" :class="$style.keyMemory">
							{{ sentence }}
						</N8nText>
					</li>
				</ul>
			</div>
		</template>
	</N8nHoverCard>
</template>

<style lang="scss" module>
.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--xs);
	font-size: var(--font-size--2xs);
	text-align: right;
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtler);
	user-select: none;
}

.keyMemoryList {
	margin: 0;
	padding-left: var(--spacing--sm);

	li {
		display: list-item;
		list-style-type: disc;
		margin-bottom: var(--spacing--2xs);
	}
	li::marker {
		color: var(--border-color);
	}
}

.memorySection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-bottom: var(--border);
}

.keyMemory {
	margin: 0;
	line-height: var(--line-height--xl);
	color: var(--text-color--subtle);
	white-space: pre-wrap;
}
</style>
