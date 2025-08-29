<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { FilterTypeCombinator } from 'n8n-workflow';

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
		<n8n-select
			v-else
			size="small"
			:model-value="selected"
			@update:model-value="onCombinatorChange"
		>
			<n8n-option
				v-for="option in options"
				:key="option"
				:value="option"
				:label="i18n.baseText(`filter.combinator.${option}`)"
			>
			</n8n-option>
		</n8n-select>
	</div>
</template>

<style lang="scss" module>
.combinatorSelect {
	max-width: 80px;
	line-height: var(--font-line-height-xloose);
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
}
</style>
