<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { type Modifier, detectOverflow } from '@popperjs/core';
import { N8nInfoTip, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, ref, useCssModule } from 'vue';

interface EvaluationStep {
	title?: string;
	warning?: boolean;
	expanded?: boolean;
	description?: string;
	issues?: Array<{ field: string; message: string }>;
	showIssues?: boolean;
	tooltip: string;
	externalTooltip?: boolean;
}

const props = withDefaults(defineProps<EvaluationStep>(), {
	description: '',
	warning: false,
	expanded: false,
	issues: () => [],
	showIssues: true,
	title: '',
});

const locale = useI18n();
const isExpanded = ref(props.expanded);
const $style = useCssModule();

const hasIssues = computed(() => props.issues.length > 0);

const containerClass = computed(() => {
	return {
		[$style.evaluationStep]: true,
		[$style['has-issues']]: true,
	};
});

const toggleExpand = () => (isExpanded.value = !isExpanded.value);

const renderIssues = computed(() => props.showIssues && props.issues.length);
const issuesList = computed(() => props.issues.map((issue) => issue.message).join(', '));

/**
 * @see https://popper.js.org/docs/v2/modifiers/#custom-modifiers
 */
const resizeModifier: Modifier<'resize', {}> = {
	name: 'resize',
	enabled: true,
	phase: 'beforeWrite',
	requires: ['preventOverflow'],
	fn({ state }) {
		const overflow = detectOverflow(state);
		const MARGIN_RIGHT = 15;

		const maxWidth = state.rects.popper.width - overflow.right - MARGIN_RIGHT;

		state.styles.popper.width = `${maxWidth}px`;
	},
};

const popperModifiers = [
	resizeModifier,
	{ name: 'preventOverflow', options: { boundary: 'document' } },
	{ name: 'flip', enabled: false }, // prevent the tooltip from flipping
];
</script>

<template>
	<div :class="containerClass" data-test-id="evaluation-step">
		<div :class="$style.content">
			<N8nTooltip
				placement="right"
				:disabled="!externalTooltip"
				:show-arrow="false"
				:popper-class="$style.evaluationTooltip"
				:popper-options="{ modifiers: popperModifiers }"
				:content="tooltip"
			>
				<div :class="$style.header" @click="toggleExpand">
					<div :class="$style.label">
						<N8nText bold>
							<slot v-if="$slots.title" name="title" />
							<template v-else>{{ title }}</template>
						</N8nText>
						<N8nInfoTip
							v-if="!externalTooltip"
							:class="$style.infoTip"
							:bold="true"
							type="tooltip"
							theme="info"
							tooltip-placement="top"
							:enterable="false"
						>
							{{ tooltip }}
						</N8nInfoTip>
					</div>
					<div :class="$style.actions">
						<N8nInfoTip
							v-if="renderIssues"
							:bold="true"
							type="tooltip"
							theme="warning"
							tooltip-placement="top"
							:enterable="false"
						>
							{{ issuesList }}
						</N8nInfoTip>
						<N8nText
							v-if="$slots.cardContent"
							data-test-id="evaluation-step-collapse-button"
							size="xsmall"
							:color="hasIssues ? 'primary' : 'text-base'"
							bold
						>
							{{
								isExpanded
									? locale.baseText('evaluation.edit.step.collapse')
									: locale.baseText('evaluation.edit.step.configure')
							}}
							<font-awesome-icon :icon="isExpanded ? 'angle-up' : 'angle-down'" size="lg" />
						</N8nText>
					</div>
				</div>
			</N8nTooltip>
			<div v-if="$slots.cardContent && isExpanded" :class="$style.cardContentWrapper">
				<div :class="$style.cardContent" data-test-id="evaluation-step-content">
					<N8nText v-if="description" size="small" color="text-light">{{ description }}</N8nText>
					<slot name="cardContent" />
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.evaluationStep {
	display: grid;
	grid-template-columns: 1fr;
	background: var(--color-background-xlight);
	border-radius: var(--border-radius-large);
	border: var(--border-base);
	width: 100%;
	color: var(--color-text-dark);
}

.evaluationTooltip {
	&:global(.el-popper) {
		background-color: transparent;
		font-size: var(--font-size-xs);
		color: var(--color-text-light);
		line-height: 1rem;
		max-width: 25rem;
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

.actions {
	margin-left: auto;
	display: flex;
	gap: var(--spacing-2xs);
}

.cardContent {
	font-size: var(--font-size-s);
	padding: 0 var(--spacing-s);
	margin: var(--spacing-s) 0;
}

.cardContentWrapper {
	border-top: var(--border-base);
}

.has-issues {
	/**
		* This comment is needed or the css module
		* will interpret as undefined
	 */
}
</style>
