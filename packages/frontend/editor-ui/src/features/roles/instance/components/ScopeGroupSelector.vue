<script setup lang="ts">
import { N8nCheckbox, N8nLoading, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	INSTANCE_OPTION_LABEL_KEYS,
	INSTANCE_SCOPE_GROUP_LIST,
	SUPERSEDED_BY,
	isOptionImplied,
	resolveOptionState,
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

function impliedTooltip(option: InstanceScopeOption): string {
	const supersededByKey = SUPERSEDED_BY[option.key];
	if (!supersededByKey) return '';
	const labelKey = INSTANCE_OPTION_LABEL_KEYS[supersededByKey];
	return i18n.baseText('instanceRoles.option.includedIn', {
		interpolate: { option: i18n.baseText(labelKey) },
	});
}

function onToggle(option: InstanceScopeOption, groupOptions: InstanceScopeOption[]) {
	if (props.readonly) return;
	if (isOptionImplied(option, groupOptions, props.modelValue)) return;
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
					<N8nTooltip
						v-for="option in group.options"
						:key="option.key"
						:content="impliedTooltip(option)"
						:disabled="!isOptionImplied(option, group.options, modelValue)"
						placement="top"
					>
						<N8nCheckbox
							:data-test-id="optionTestId(group.resource, option)"
							:label="i18n.baseText(option.labelKey)"
							:model-value="resolveOptionState(option, group.options, modelValue) === 'checked'"
							:indeterminate="
								resolveOptionState(option, group.options, modelValue) === 'indeterminate'
							"
							:disabled="readonly || isOptionImplied(option, group.options, modelValue)"
							:class="$style.checkbox"
							@update:model-value="onToggle(option, group.options)"
						/>
					</N8nTooltip>
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
