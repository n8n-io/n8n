<script setup lang="ts">
import { N8nCheckbox, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	INSTANCE_SCOPE_GROUP_LIST,
	getOptionState,
	toggleOption,
	type InstanceScopeOption,
} from '../instanceRoleScopes';

const i18n = useI18n();

const props = withDefaults(
	defineProps<{
		/** Saved flat scope list the role persists. */
		modelValue: string[];
		readonly?: boolean;
		loading?: boolean;
	}>(),
	{ readonly: false, loading: false },
);

const emit = defineEmits<{ 'update:modelValue': [scopes: string[]] }>();

const groups = INSTANCE_SCOPE_GROUP_LIST;

/** data-testid must be a single value: turn "Manage own" into "manage-own". */
function optionTestId(resource: string, option: InstanceScopeOption): string {
	const slug = option.key.toLowerCase().replace(/\s+/g, '-');
	return `scope-option-${resource}-${slug}`;
}

function onToggle(option: InstanceScopeOption) {
	if (props.readonly) return;
	emit('update:modelValue', toggleOption(props.modelValue, option.scopes));
}
</script>

<template>
	<div :class="$style.cardContainer">
		<div v-for="group in groups" :key="group.resource" :class="$style.card">
			<div :class="$style.cardTitle">
				{{ i18n.baseText(group.labelKey) }}
			</div>
			<div :class="$style.optionList">
				<N8nLoading v-if="loading" :rows="group.options.length" :shrink-last="false" />
				<template v-else>
					<N8nCheckbox
						v-for="option in group.options"
						:key="option.key"
						:data-test-id="optionTestId(group.resource, option)"
						:label="i18n.baseText(option.labelKey)"
						:model-value="getOptionState(modelValue, option.scopes) === 'checked'"
						:indeterminate="getOptionState(modelValue, option.scopes) === 'indeterminate'"
						:disabled="readonly"
						:class="$style.checkbox"
						@update:model-value="onToggle(option)"
					/>
				</template>
			</div>
		</div>
	</div>
</template>

<style lang="css" module>
.cardContainer {
	padding: 0 var(--spacing--lg);
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-3);
}

.card {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--md);
	padding: var(--spacing--md) 0;
}

.card:not(:last-child) {
	border-bottom: var(--border);
}

.cardTitle {
	width: 150px;
	flex-shrink: 0;
}

.optionList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	flex: 1;
}

.checkbox {
	margin-bottom: 0;
}
</style>
