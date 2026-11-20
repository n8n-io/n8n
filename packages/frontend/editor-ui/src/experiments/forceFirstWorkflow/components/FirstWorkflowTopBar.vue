<script lang="ts" setup>
import { computed } from 'vue';
import { N8nBreadcrumbs, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	workflowName: string;
	/** Index of the current step. A value past the last step marks every step as done. */
	stepIndex: number;
	showSkip: boolean;
}>();

const emit = defineEmits<{ skip: [] }>();

const i18n = useI18n();

const breadcrumbs = computed(() => [
	{ id: 'project', label: i18n.baseText('experiments.forceFirstWorkflow.breadcrumb.project') },
	{ id: 'workflow', label: props.workflowName },
]);

const steps = computed(() => [
	i18n.baseText('experiments.forceFirstWorkflow.steps.questions'),
	i18n.baseText('experiments.forceFirstWorkflow.steps.test'),
	i18n.baseText('experiments.forceFirstWorkflow.steps.publish'),
]);
</script>

<template>
	<header :class="$style.bar" data-test-id="first-workflow-top-bar">
		<div :class="$style.start">
			<N8nBreadcrumbs :items="breadcrumbs" highlight-last-item />
		</div>

		<ol :class="$style.steps" data-test-id="first-workflow-steps">
			<li
				v-for="(label, index) in steps"
				:key="label"
				:class="[
					$style.step,
					index < stepIndex && $style.done,
					index === stepIndex && $style.current,
				]"
				:aria-current="index === stepIndex ? 'step' : undefined"
			>
				<N8nIcon v-if="index < stepIndex" icon="check" size="small" />
				<span v-else :class="$style.number">{{ index + 1 }}</span>
				<N8nText size="small" :bold="index === stepIndex">{{ label }}</N8nText>
			</li>
		</ol>

		<div :class="$style.end">
			<N8nButton
				v-if="showSkip"
				variant="ghost"
				:label="i18n.baseText('experiments.forceFirstWorkflow.skip')"
				data-test-id="first-workflow-skip"
				data-attr="first-workflow-skip"
				@click="emit('skip')"
			/>
		</div>
	</header>
</template>

<style lang="scss" module>
.bar {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--md);
	background: var(--color--background--light-3);
	border-bottom: var(--border);
}

.start {
	min-width: 0;
}

.end {
	display: flex;
	justify-content: flex-end;
}

.steps {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
	margin: 0;
	padding: 0;
	list-style: none;
}

.step {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--text--tint-1);
}

.current {
	color: var(--color--text--shade-1);
}

.done {
	color: var(--color--success);
}

.number {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--md);
	height: var(--spacing--md);
	border: var(--border);
	border-radius: 50%;
	font-size: var(--font-size--3xs);
}
</style>
