<script setup lang="ts">
import { N8nCallout, N8nCheckbox, N8nLink, N8nLoading, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants';
import {
	INSTANCE_SCOPE_GROUP_LIST,
	getEscalationWarningKey,
	impliedByOption,
	isOptionImplied,
	isOptionMandatory,
	mandatoryOptionTooltipKey,
	resolveOptionState,
	toggleOptionInGroup,
	type InstanceResource,
	type InstanceScopeOption,
} from '../instanceRoleScopes';
import PersonalSpacePermissions from './PersonalSpacePermissions.vue';

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
	const superseding = impliedByOption(option, groupOptions, props.modelValue);
	if (!superseding) return '';
	return i18n.baseText('instanceRoles.option.includedIn', {
		interpolate: { option: i18n.baseText(superseding.labelKey) },
	});
}

/**
 * Tooltip shown for a permission option. A mandatory option (granted to every
 * role, see `isOptionMandatory`) explains why it can't be turned off; an option
 * implied by another (e.g. "Manage own" under a checked "Manage all") shows the
 * "Included in …" note; otherwise it explains what the permission grants.
 */
function optionTooltip(
	resource: InstanceResource,
	option: InstanceScopeOption,
	groupOptions: InstanceScopeOption[],
): string {
	// Mandatory wins over "Included in …": for an option that can never be unchecked,
	// saying it is included in another implies unchecking that other one would remove
	// it, which is false.
	const mandatoryKey = mandatoryOptionTooltipKey(resource, option);
	if (mandatoryKey) return i18n.baseText(mandatoryKey);
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
	<div :class="$style.container">
		<!-- Every user owns a personal project whatever the role grants. Shown first, in
		     its own card, so nobody reads an empty role as "no access at all". -->
		<div :class="$style.cardContainer" data-test-id="personal-space-card">
			<div :class="$style.card">
				<div :class="$style.cardTitle">
					{{ i18n.baseText('instanceRoles.personalSpace.title') }}
				</div>
				<div :class="$style.optionList">
					<PersonalSpacePermissions />
				</div>
			</div>
		</div>
		<div :class="$style.cardContainer" data-test-id="instance-permissions-card">
			<div v-for="group in groups" :key="group.resource" :class="$style.card">
				<div :class="$style.cardTitle">
					{{ i18n.baseText(group.labelKey) }}
				</div>
				<div :class="[$style.optionList, $style.optionListInset]">
					<div v-if="loading" :class="$style.loading">
						<N8nLoading :rows="group.options.length" :shrink-last="false" />
					</div>
					<template v-else>
						<N8nTooltip
							v-for="option in group.options"
							:key="option.key"
							:content="optionTooltip(group.resource, option, group.options)"
							:disabled="!optionTooltip(group.resource, option, group.options)"
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
								:disabled="
									readonly ||
									isOptionImplied(option, group.options, modelValue) ||
									isOptionMandatory(group.resource, option)
								"
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
	</div>
</template>

<style lang="css" module>
.container {
	display: flex;
	flex-direction: column;
	/* The personal space card is read-only and applies to every role; the gap
	   separates it from the permissions the role actually grants. */
	gap: var(--spacing--lg);
}

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
	/* Center on the first option row, which is `--height--xs` tall (see `.checkbox`). */
	line-height: var(--height--xs);
}

.optionList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	flex: 1;
	/* Keep each tooltip trigger as wide as its option, so the tooltip opens
	   beside the hovered option and not at the right edge of the card. */
	align-items: flex-start;
}

/* These options have no chevron. Reserve the chevron column of the personal
   space rows (an `xsmall` icon button plus its gap, see PersonalSpacePermissions)
   so the checkboxes line up across the cards. */
.optionListInset {
	--option-inset: calc(var(--height--xs) + var(--spacing--4xs));
}

.checkbox {
	margin-bottom: 0;
	/* Same row height as a personal space row, so the two cards share one rhythm. */
	min-height: var(--height--xs);
	align-items: center;
}

.optionListInset .checkbox {
	margin-left: var(--option-inset);
}

/* Also opts out: the skeleton rows size themselves in percent of this wrapper,
   which stretches from the checkbox column to the card edge. */
.loading {
	align-self: stretch;
	margin-left: var(--option-inset);
}

.warning {
	margin-top: var(--spacing--2xs);
	/* Opt out of the option alignment above: the callout spans the whole card. */
	align-self: stretch;
}
</style>
