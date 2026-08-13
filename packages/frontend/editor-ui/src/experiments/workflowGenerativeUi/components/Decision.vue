<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{
	question: string;
	branches: Array<{ label: string; condition: string }>;
	nodeId?: string | null;
}>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard :node-id="nodeId" label="Decision" :title="question" @press="$emit('press')"
		><ul :class="$style.branches">
			<li v-for="branch in branches" :key="`${branch.label}-${branch.condition}`">
				<strong>{{ branch.label }}</strong
				><span>{{ branch.condition }}</span>
			</li>
		</ul></ActionCard
	>
</template>
<style lang="scss" module>
.branches {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}
.branches li {
	display: grid;
	grid-template-columns: minmax(var(--spacing--3xl), auto) 1fr;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	background: var(--background--subtle);
	border-radius: var(--radius--2xs);
}
.branches strong {
	font-weight: var(--font-weight--medium);
}
.branches span {
	color: var(--text-color--subtle);
}
</style>
