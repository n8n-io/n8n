<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';

import {
	reviewPrototypeState,
	setReviewPrototypeMode,
	type ReviewPolicyMode,
} from '@/features/workflow-reviews/reviewPrototype.state';

const i18n = useI18n();

const mode = computed(() => reviewPrototypeState.mode);

const options: Array<{
	value: ReviewPolicyMode;
	labelKey: 'workflowReviews.prototype.mode.basic' | 'workflowReviews.prototype.mode.custom';
	testId: string;
}> = [
	{
		value: 'basic',
		labelKey: 'workflowReviews.prototype.mode.basic',
		testId: 'review-policy-prototype-mode-basic',
	},
	{
		value: 'custom',
		labelKey: 'workflowReviews.prototype.mode.custom',
		testId: 'review-policy-prototype-mode-custom',
	},
];

function select(value: ReviewPolicyMode) {
	setReviewPrototypeMode(value);
}
</script>

<template>
	<div
		:class="$style.switch"
		role="radiogroup"
		:aria-label="i18n.baseText('workflowReviews.prototype.mode.label')"
		data-test-id="review-policy-prototype-mode"
	>
		<button
			v-for="option in options"
			:key="option.value"
			type="button"
			role="radio"
			:class="$style.segment"
			:aria-checked="mode === option.value"
			:data-test-id="option.testId"
			@click="select(option.value)"
		>
			{{ i18n.baseText(option.labelKey) }}
		</button>
	</div>
</template>

<style module>
.switch {
	position: fixed;
	right: var(--spacing--lg);
	bottom: var(--spacing--lg);
	z-index: var(--floating-ui--z);
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs);
	background-color: var(--color--neutral-900);
	border-radius: var(--radius--full);
	/* 1px hairline. No border-width token exists. */
	border: 1px solid var(--color--neutral-700);
	box-shadow: var(--shadow--md);
}

.segment {
	appearance: none;
	border: none;
	margin: 0;
	height: var(--height--md);
	padding: 0 var(--spacing--sm);
	border-radius: var(--radius--full);
	background-color: transparent;
	color: var(--color--neutral-300);
	font-family: inherit;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xs);
	cursor: pointer;
	white-space: nowrap;
	transition:
		background-color var(--duration--snappy),
		color var(--duration--snappy);
}

.segment:hover:not([aria-checked='true']) {
	background-color: var(--color--white-alpha-100);
	color: var(--color--neutral-white);
}

.segment:focus {
	outline: none;
}

.segment:focus-visible {
	outline: var(--spacing--5xs) solid var(--button--outline-color--primary--focus);
	outline-offset: var(--spacing--5xs);
}

.segment[aria-checked='true'] {
	background-color: var(--button--color--background--primary);
	color: var(--button--color--text--primary);
}
</style>
