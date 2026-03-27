<script lang="ts" setup>
import { ref, watch, onMounted, useTemplateRef, nextTick } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		isStreaming: boolean;
		maxHeight?: number;
	}>(),
	{
		maxHeight: 400,
	},
);

const i18n = useI18n();
const contentRef = useTemplateRef<HTMLElement>('content');
const isExpanded = ref(true);
const needsCollapse = ref(false);

function checkHeight() {
	if (contentRef.value && contentRef.value.scrollHeight > props.maxHeight) {
		needsCollapse.value = true;
		isExpanded.value = false;
	}
}

watch(
	() => props.isStreaming,
	(streaming, was) => {
		if (was && !streaming) {
			void nextTick(() => checkHeight());
		}
	},
);

onMounted(() => {
	if (!props.isStreaming) {
		checkHeight();
	}
});
</script>

<template>
	<div>
		<div
			:class="[$style.wrapper, needsCollapse && !isExpanded ? $style.collapsed : '']"
			:style="needsCollapse && !isExpanded ? { maxHeight: `${props.maxHeight}px` } : {}"
		>
			<div ref="content">
				<slot />
			</div>
			<div v-if="needsCollapse && !isExpanded" :class="$style.fadeOverlay">
				<button :class="$style.toggleButton" @click="isExpanded = true">
					{{ i18n.baseText('instanceAi.message.showMore') }}
					<N8nIcon icon="chevron-down" size="small" />
				</button>
			</div>
		</div>
		<div v-if="needsCollapse && isExpanded" :class="$style.collapseRow">
			<button :class="$style.toggleButton" @click="isExpanded = false">
				{{ i18n.baseText('instanceAi.message.showLess') }}
				<N8nIcon icon="chevron-up" size="small" />
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	overflow: hidden;
}

.collapsed {
	// max-height set inline from threshold prop
}

.fadeOverlay {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 80px;
	background: linear-gradient(transparent, var(--color--background--light-1));
	display: flex;
	align-items: flex-end;
	justify-content: center;
	padding-bottom: var(--spacing--2xs);
}

.collapseRow {
	display: flex;
	justify-content: center;
	padding-top: var(--spacing--4xs);
}

.toggleButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--xs);
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius--xl);
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-1);
	}
}
</style>
