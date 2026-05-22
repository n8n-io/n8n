<script setup lang="ts">
import { computed, ref } from 'vue';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from 'reka-ui';
import { N8nText } from '@n8n/design-system';

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
	<HoverCardRoot
		v-if="memories.length > 0"
		v-model:open="isOpen"
		:open-delay="400"
		:close-delay="0"
		@update:open="onOpenChange"
	>
		<HoverCardTrigger as-child>
			<div :class="$style.trigger">
				<span>
					{{
						i18n.baseText(memoriesCountLabelKey, {
							adjustToNumber: memories.length,
							interpolate: { count: String(memories.length) },
						})
					}}
				</span>
			</div>
		</HoverCardTrigger>
		<HoverCardPortal>
			<HoverCardContent side="bottom" align="end" :class="[$style.popoverContent, $style.panel]">
				<div v-for="memory in memories" :key="memory.id" :class="$style.memorySection">
					<N8nText step="sm" bold :class="$style.label">
						{{ i18n.baseText(keyMemoryLabelKey) }}
					</N8nText>
					<ul :class="$style.keyMemoryList">
						<li v-for="sentence in splitKeyMemory(memory.keyMemory)" :key="sentence">
							<N8nText step="sm" tag="p" :class="$style.keyMemory">
								{{ sentence }}
							</N8nText>
						</li>
					</ul>
				</div>
			</HoverCardContent>
		</HoverCardPortal>
	</HoverCardRoot>
</template>

<style lang="scss" module>
@use '../../../../../@n8n/design-system/src/css/mixins/motion';

/** When https://github.com/n8n-io/n8n/pull/30611 is merged we can replace with proper N8nHoverCard component **/
.popoverContent {
	--popover--offset--slide-x: 0;
	--popover--offset--slide-y: 0;
	--popover--offset--origin-x: center;
	--popover--offset--origin-y: center;
	--animation--popover-in--translate-x: var(--popover--offset--slide-x);
	--animation--popover-in--translate-y: var(--popover--offset--slide-y);

	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	box-shadow:
		var(--shadow--md),
		inset var(--shadow--outline);
	will-change: transform, opacity;
	transform-origin: var(--popover--offset--origin-x) var(--popover--offset--origin-y);

	&[data-state='open'] {
		@include motion.popover-in;
	}

	&[data-state='closed'] {
		display: none;
	}
}

.popoverContent[data-state='open'][data-side='top'] {
	--popover--offset--slide-y: -2px;
	--popover--offset--origin-y: bottom;
}

.popoverContent[data-state='open'][data-side='right'] {
	--popover--offset--slide-x: 2px;
	--popover--offset--origin-x: left;
}

.popoverContent[data-state='open'][data-side='bottom'] {
	--popover--offset--slide-y: 2px;
	--popover--offset--origin-y: top;
}

.popoverContent[data-state='open'][data-side='left'] {
	--popover--offset--slide-x: -2px;
	--popover--offset--origin-x: right;
}

.popoverContent[data-state='open'][data-side='top'][data-align='start'],
.popoverContent[data-state='open'][data-side='bottom'][data-align='start'] {
	--popover--offset--slide-x: -2px;
	--popover--offset--origin-x: left;
}

.popoverContent[data-state='open'][data-side='top'][data-align='end'],
.popoverContent[data-state='open'][data-side='bottom'][data-align='end'] {
	--popover--offset--slide-x: 2px;
	--popover--offset--origin-x: right;
}

.popoverContent[data-state='open'][data-side='left'][data-align='start'],
.popoverContent[data-state='open'][data-side='right'][data-align='start'] {
	--popover--offset--slide-y: -2px;
	--popover--offset--origin-y: top;
}

.popoverContent[data-state='open'][data-side='left'][data-align='end'],
.popoverContent[data-state='open'][data-side='right'][data-align='end'] {
	--popover--offset--slide-y: 2px;
	--popover--offset--origin-y: bottom;
}

.panel {
	max-width: 24rem;
	max-height: 280px;
	overflow-y: auto;
	scrollbar-width: none;
	-ms-overflow-style: none;
}

.panel::-webkit-scrollbar {
	display: none;
}

.trigger {
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
