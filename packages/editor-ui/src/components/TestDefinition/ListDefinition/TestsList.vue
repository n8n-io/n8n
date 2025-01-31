<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import TestItem from './TestItem.vue';
import type { TestListItem, TestItemAction } from '@/components/TestDefinition/types';
export interface TestListProps {
	tests: TestListItem[];
	actions: TestItemAction[];
}

defineEmits<{ 'create-test': []; 'view-details': [testId: string] }>();
defineProps<TestListProps>();
const locale = useI18n();
</script>

<template>
	<div :class="$style.testsList" data-test-id="test-definition-list">
		<div :class="$style.testsHeader">
			<n8n-button
				:label="locale.baseText('testDefinition.list.createNew')"
				@click="$emit('create-test')"
			/>
		</div>
		<TestItem
			v-for="test in tests"
			:key="test.id"
			:test="test"
			:actions="actions"
			@view-details="$emit('view-details', test.id)"
		/>
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
