<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	question: string;
	branches: Array<{ label: string; condition: string }>;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="question"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.decision" data-test-id="decision-branches">
			<header :class="$style.question">
				<NodeBrand :node-id="nodeId" :size="16" />
				<h4 :class="$style.text">{{ question }}</h4>
			</header>
			<ul :class="$style.paths">
				<li
					v-for="branch in branches"
					:key="`${branch.label}-${branch.condition}`"
					:class="$style.path"
					data-test-id="decision-branch"
				>
					<span :class="$style.label">{{ branch.label }}</span>
					<span :class="$style.condition">{{ branch.condition }}</span>
				</li>
			</ul>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.decision {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--md);
}

.question {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.text {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
}

.paths {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0 0 0 var(--spacing--sm);
	list-style: none;
	border-left: var(--border);
}

.path {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	position: relative;
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--background--subtle);
	border-radius: var(--radius--sm);
}

.path::before {
	content: '';
	position: absolute;
	top: 50%;
	left: calc(var(--spacing--sm) * -1);
	width: var(--spacing--sm);
	border-top: var(--border);
}

.label {
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.condition {
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	overflow-wrap: anywhere;
}
</style>
