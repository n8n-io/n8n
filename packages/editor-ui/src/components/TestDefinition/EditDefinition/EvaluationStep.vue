<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { ElCollapseTransition } from 'element-plus';
import { ref, nextTick } from 'vue';

interface EvaluationStep {
	title: string;
	warning?: boolean;
	small?: boolean;
	expanded?: boolean;
}

const props = withDefaults(defineProps<EvaluationStep>(), {
	description: '',
	warning: false,
	small: false,
	expanded: true,
});

const locale = useI18n();
const isExpanded = ref(props.expanded);
const contentRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

const toggleExpand = async () => {
	isExpanded.value = !isExpanded.value;
	if (isExpanded.value) {
		await nextTick();
		if (containerRef.value) {
			containerRef.value.style.height = 'auto';
		}
	}
};
</script>

<template>
	<div ref="containerRef" :class="[$style.evaluationStep, small && $style.small]">
		<div :class="$style.content">
			<div :class="$style.header">
				<div :class="[$style.icon, warning && $style.warning]">
					<slot name="icon" />
				</div>
				<h3 :class="$style.title">{{ title }}</h3>
				<span v-if="warning" :class="$style.warningIcon">⚠</span>
				<button
					v-if="$slots.cardContent"
					:class="$style.collapseButton"
					:aria-expanded="isExpanded"
					:aria-controls="'content-' + title.replace(/\s+/g, '-')"
					@click="toggleExpand"
				>
					{{
						isExpanded
							? locale.baseText('testDefinition.edit.step.collapse')
							: locale.baseText('testDefinition.edit.step.expand')
					}}
					<font-awesome-icon :icon="isExpanded ? 'angle-down' : 'angle-right'" size="lg" />
				</button>
			</div>
			<ElCollapseTransition v-if="$slots.cardContent">
				<div v-show="isExpanded" :class="$style.cardContentWrapper">
					<div ref="contentRef" :class="$style.cardContent">
						<slot name="cardContent" />
					</div>
				</div>
			</ElCollapseTransition>
		</div>
	</div>
</template>

<style module lang="scss">
.evaluationStep {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--spacing-m);
	background: var(--color-background-light);
	padding: var(--spacing-s);
	border-radius: var(--border-radius-xlarge);
	box-shadow: var(--box-shadow-base);
	border: var(--border-base);
	width: 100%;
	color: var(--color-text-dark);

	&.small {
		width: 80%;
	}
}
.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--border-radius-base);
	overflow: hidden;
	width: 2rem;
	height: 2rem;

	&.warning {
		background-color: var(--color-warning-tint-2);
	}
}

.content {
	display: grid;
	gap: var(--spacing-2xs);
}

.header {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
}

.title {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
	line-height: 1.125rem;
}

.warningIcon {
	color: var(--color-warning);
}

.cardContent {
	font-size: var(--font-size-s);
	margin-top: var(--spacing-xs);
}
.collapseButton {
	cursor: pointer;
	border: none;
	background: none;
	padding: 0;
	font-size: var(--font-size-3xs);
	color: var(--color-text-base);
	margin-left: auto;
	text-wrap: none;
	overflow: hidden;
	min-width: fit-content;
}
.cardContentWrapper {
	height: max-content;
}
</style>
