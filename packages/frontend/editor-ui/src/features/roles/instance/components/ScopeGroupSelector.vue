<script setup lang="ts">
import { N8nCallout, N8nCheckbox, N8nLink, N8nLoading, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants';
import {
	INSTANCE_SCOPE_GROUP_LIST,
	SUPERSEDED_BY,
	getEscalationWarningKey,
	isOptionImplied,
	resolveOptionState,
	toggleOptionInGroup,
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

function impliedTooltip(option: InstanceScopeOption, groupOptions: InstanceScopeOption[]): string {
	const supersededByKey = SUPERSEDED_BY[option.key];
	if (!supersededByKey) return '';
	const superseding = groupOptions.find((o) => o.key === supersededByKey);
	if (!superseding) return '';
	return i18n.baseText('instanceRoles.option.includedIn', {
		interpolate: { option: i18n.baseText(superseding.labelKey) },
	});
}

/**
 * Tooltip shown for a permission option. When the option is implied by another
 * (e.g. "Manage own" under a checked "Manage all") the "Included in …" note
 * takes precedence; otherwise it explains what the permission grants.
 */
function optionTooltip(option: InstanceScopeOption, groupOptions: InstanceScopeOption[]): string {
	if (isOptionImplied(option, groupOptions, props.modelValue)) {
		return impliedTooltip(option, groupOptions);
	}
	return option.descriptionKey ? i18n.baseText(option.descriptionKey) : '';
}

function onToggle(option: InstanceScopeOption, groupOptions: InstanceScopeOption[]) {
	if (props.readonly) return;
	if (isOptionImplied(option, groupOptions, props.modelValue)) return;
	emit('update:modelValue', toggleOptionInGroup(props.modelValue, option, groupOptions));
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
						:content="optionTooltip(option, group.options)"
						:disabled="!optionTooltip(option, group.options)"
						placement="right"
						:enterable="false"
						:show-after="250"
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
				<N8nCallout
					v-if="!readonly && getEscalationWarningKey(group.resource, modelValue)"
					theme="warning"
					:class="$style.warning"
					:data-test-id="`scope-escalation-warning-${group.resource}`"
				>
					<I18nT :keypath="getEscalationWarningKey(group.resource, modelValue)!" scope="global">
						<template #link>
							<N8nLink
								:href="CUSTOM_ROLES_DOCS_URL"
								:new-window="true"
								size="small"
								theme="secondary"
								:bold="true"
								:underline="true"
							>
								{{ i18n.baseText('instanceRoles.warning.viewDocs') }}
							</N8nLink>
						</template>
					</I18nT>
				</N8nCallout>
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

.warning {
	margin-top: var(--spacing--2xs);
}
</style>
