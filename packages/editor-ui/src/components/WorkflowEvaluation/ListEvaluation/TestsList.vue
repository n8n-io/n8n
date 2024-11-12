<script setup lang="ts">
import TestItem from './TestItem.vue';
import type { TestListItem } from '@/components/WorkflowEvaluation/types';

export interface TestListProps {
	tests: TestListItem[];
}
defineEmits<{ 'create-test': [] }>();
defineProps<TestListProps>();
</script>

<template>
	<div :class="$style.testsList">
		<div :class="$style.testsHeader">
			<n8n-button label="Create new test" @click="$emit('create-test')" />
		</div>
		<TestItem v-for="test in tests" :key="test.id" :test="test" v-bind="$attrs" />
	</div>
</template>

<style module lang="scss">
.testsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.testsHeader {
	margin-bottom: var(--spacing-m);
}
</style>
