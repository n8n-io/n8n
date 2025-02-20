<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { ElCollapseTransition } from 'element-plus';
import { computed, nextTick, ref, useCssModule } from 'vue';

interface EvaluationStep {
	title?: string;
	warning?: boolean;
	small?: boolean;
	expanded?: boolean;
	description?: string;
	issues?: Array<{ field: string; message: string }>;
	showIssues?: boolean;
	tooltip?: string;
}

const props = withDefaults(defineProps<EvaluationStep>(), {
	description: '',
	warning: false,
	small: false,
	expanded: false,
	issues: () => [],
	showIssues: true,
	title: '',
});

const locale = useI18n();
const isExpanded = ref(props.expanded);
const contentRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const showTooltip = ref(false);
const $style = useCssModule();

const containerClass = computed(() => {
	return {
		[$style.wrap]: true,
		[$style.expanded]: isExpanded.value,
		[$style.hasIssues]: props.issues.length > 0,
	};
});

const toggleExpand = async () => {
	isExpanded.value = !isExpanded.value;
	if (isExpanded.value) {
		await nextTick();
		if (containerRef.value) {
			containerRef.value.style.height = 'auto';
		}
	}
};

const handleMouseEnter = () => {
	if (!props.tooltip) return;
	showTooltip.value = true;
};

const handleMouseLeave = () => {
	showTooltip.value = false;
};

const renderIssues = computed(() => props.showIssues && props.issues.length);
const issuesList = computed(() => props.issues.map((issue) => issue.message).join(', '));
</script>

<template>
	<div :class="containerClass">
		<slot name="containerPrefix" />
		<div
			ref="containerRef"
			:class="[$style.evaluationStep, small && $style.small]"
			data-test-id="evaluation-step"
			@mouseenter="handleMouseEnter"
			@mouseleave="handleMouseLeave"
		>
			<div :class="$style.content">
				<div :class="$style.header" @click="toggleExpand">
					<h3 :class="$style.title">
						<span :class="$style.label">
							<slot v-if="$slots.title" name="title" />
							<span v-else>{{ title }}</span>
							<N8nInfoTip
								v-if="tooltip"
								:class="$style.infoTip"
								:bold="true"
								type="tooltip"
								theme="info"
								tooltip-placement="top"
							>
								{{ tooltip }}
							</N8nInfoTip>
						</span>
					</h3>
					<span v-if="renderIssues" :class="$style.warningIcon">
						<N8nInfoTip :bold="true" type="tooltip" theme="warning" tooltip-placement="right">
							{{ issuesList }}
						</N8nInfoTip>
					</span>
					<button
						v-if="$slots.cardContent"
						:class="$style.collapseButton"
						:aria-expanded="isExpanded"
						data-test-id="evaluation-step-collapse-button"
					>
						{{
							isExpanded
								? locale.baseText('testDefinition.edit.step.collapse')
								: locale.baseText('testDefinition.edit.step.configure')
						}}
						<font-awesome-icon :icon="isExpanded ? 'angle-down' : 'angle-right'" size="lg" />
					</button>
				</div>
				<ElCollapseTransition v-if="$slots.cardContent">
					<div v-show="isExpanded" :class="$style.cardContentWrapper">
						<div
							ref="contentRef"
							:class="$style.cardContent"
							data-test-id="evaluation-step-content"
						>
							<div v-if="description" :class="$style.description">{{ description }}</div>
							<slot name="cardContent" />
						</div>
					</div>
				</ElCollapseTransition>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.wrap {
	position: relative;
}
.evaluationStep {
	display: grid;
	grid-template-columns: 1fr;
	background: var(--color-background-xlight);
	border-radius: var(--border-radius-large);
	border: var(--border-base);
	width: 100%;
	color: var(--color-text-dark);
	position: relative;
	z-index: 1;
	&.small {
		width: 80%;
		margin-left: auto;
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
}

.header {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
	cursor: pointer;
	padding: var(--spacing-s);
}

.title {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
	line-height: 1.125rem;
}
.label {
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
}
.infoTip {
	opacity: 0;
}
.evaluationStep:hover .infoTip {
	opacity: 1;
}
.warningIcon {
	color: var(--color-warning);
}

.cardContent {
	font-size: var(--font-size-s);
	padding: 0 var(--spacing-s);
	margin: var(--spacing-s) 0;
}
.collapseButton {
	pointer-events: none;
	border: none;
	background: none;
	padding: 0;
	font-size: var(--font-size-3xs);
	color: var(--color-text-base);
	margin-left: auto;
	text-wrap: none;
	overflow: hidden;
	min-width: fit-content;

	.hasIssues & {
		color: var(--color-danger);
	}
}
.cardContentWrapper {
	height: max-content;
	.expanded & {
		border-top: var(--border-base);
	}
}

.description {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	line-height: 1rem;
}

.customTooltip {
	position: absolute;
	left: 0;
	background: var(--color-background-dark);
	color: var(--color-text-light);
	padding: var(--spacing-3xs) var(--spacing-2xs);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-2xs);
	pointer-events: none;
}
</style>
