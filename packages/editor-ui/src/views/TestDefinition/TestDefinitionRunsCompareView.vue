\
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import EmptyState from '@/components/TestDefinition/ListDefinition/EmptyState.vue';
import TestsList from '@/components/TestDefinition/ListDefinition/TestsList.vue';
import type { TestExecution, TestListItem } from '@/components/TestDefinition/types';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import type { TestDefinitionRecord } from '@/api/testDefinition.ee';

const router = useRouter();
const tagsStore = useAnnotationTagsStore();
const testDefinitionStore = useTestDefinitionStore();
const isLoading = ref(false);
const toast = useToast();
const locale = useI18n();
</script>

<template>
	<div :class="$style.container">
		<!-- TODO: Implement run compare -->
	</div>
</template>
<style module lang="scss">
.container {
	padding: var(--spacing-xl) var(--spacing-l);
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
}
.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}
</style>
