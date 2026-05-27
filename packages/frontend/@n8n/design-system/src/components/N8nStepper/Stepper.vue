<script setup lang="ts">
import N8nText from '../N8nText';

interface StepperStep {
	id: string;
	title: string;
	description?: string;
}

interface StepperProps {
	steps: StepperStep[];
	showIndex?: boolean;
}

defineOptions({
	name: 'N8nStepper',
	inheritAttrs: false,
});

const props = withDefaults(defineProps<StepperProps>(), {
	showIndex: true,
});

defineSlots<{
	default(props: { step: StepperStep; index: number }): unknown;
}>();
</script>

<template>
	<ol :class="$style.list">
		<li v-for="(step, index) in steps" :key="step.id">
			<aside :class="$style.aside">
				<div v-if="showIndex" :class="$style.index">
					{{ index + 1 }}
				</div>
				<div v-else :class="$style.dot"></div>
				<span v-if="index !== steps.length - 1" :class="$style.rail" aria-hidden="true"></span>
			</aside>

			<div :class="[$style.content, showIndex ? null : $style.contentNoIndex]">
				<div role="header" :class="$style.header">
					<N8nText step="sm" bold>{{ step.title }}</N8nText>
					<N8nText v-if="step.description" step="sm" color="text-light">{{
						step.description
					}}</N8nText>
				</div>
				<slot :step="step" :index="index" />
			</div>
		</li>
	</ol>
</template>

<style module>
.list {
	display: flex;
	align-items: center;
	flex-direction: column;

	li {
		width: 100%;
		list-style: none;
		display: flex;
		padding-bottom: var(--spacing--3xs);
	}
}
.aside {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	max-width: var(--spacing--xl);
	gap: var(--spacing--3xs);
	isolation: isolate;
}
.rail {
	inset-block: 0;
	width: 1px;
	left: calc(var(--height--md) / 2);
	height: 100%;
	background-color: var(--border-color);
	pointer-events: none;
}
.dot {
	flex-shrink: 0;
	width: var(--height--4xs);
	height: var(--height--4xs);
	border-radius: var(--radius--full);
	background-color: var(--border-color);
	z-index: 1;
}
.index {
	flex-shrink: 0;
	width: var(--height--md);
	height: var(--height--md);
	border-radius: var(--radius--full);
	background-color: var(--background--subtle);
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
	user-select: none;
	z-index: 1;
}
.content {
	flex: 1;
	width: 100%;
	display: flex;
	flex-direction: column;
	padding-inline: var(--spacing--sm);
	padding-top: var(--spacing--3xs);
	padding-bottom: var(--spacing--lg);
}
.contentNoIndex {
	padding-top: 0;
}
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
