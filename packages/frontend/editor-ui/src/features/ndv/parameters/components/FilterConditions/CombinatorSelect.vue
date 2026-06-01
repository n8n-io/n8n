<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { FilterTypeCombinator } from 'n8n-workflow';

import { N8nOption, N8nSelect } from '@n8n/design-system';
interface Props {
	options: FilterTypeCombinator[];
	selected: FilterTypeCombinator;
	readOnly: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
	combinatorChange: [value: FilterTypeCombinator];
}>();

const i18n = useI18n();

const onCombinatorChange = (combinator: FilterTypeCombinator): void => {
	emit('combinatorChange', combinator);
};
</script>

<template>
	<div data-test-id="filter-combinator-select" :class="$style.combinatorSelect">
		<div v-if="readOnly || options.length === 1">
			{{ i18n.baseText(`filter.combinator.${selected}`) }}
		</div>
		<N8nSelect v-else size="small" :model-value="selected" @update:model-value="onCombinatorChange">
			<N8nOption
				v-for="option in options"
				:key="option"
				:value="option"
				:label="i18n.baseText(`filter.combinator.${option}`)"
			>
			</N8nOption>
		</N8nSelect>
	</div>
</template>

<style lang="scss" module>
.combinatorSelect {
	max-width: 80px;
	line-height: var(--line-height--xl);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
