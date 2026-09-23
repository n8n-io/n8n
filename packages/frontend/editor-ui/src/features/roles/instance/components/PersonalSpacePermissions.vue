<script setup lang="ts">
import { N8nCallout, N8nCheckbox, N8nIconButton, N8nInfoTip, N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, useId } from 'vue';
import { I18nT } from 'vue-i18n';
import { VIEWS } from '@/app/constants';
import {
	PERSONAL_SPACE_GROUPS,
	PERSONAL_SPACE_GROUP_LABEL_KEYS,
	PERSONAL_SPACE_RESOURCES,
	PERSONAL_SPACE_RESOURCE_LABEL_KEYS,
	PERSONAL_SPACE_TOOLTIP_KEYS,
	type PersonalSpaceGroup,
} from '../personalSpacePermissions';

const i18n = useI18n();
const listId = useId();

// Collapsed by default: the block is a reminder, the editable options below it are the task.
const expanded = ref<Record<PersonalSpaceGroup, boolean>>({ view: false, manage: false });

function toggle(group: PersonalSpaceGroup) {
	expanded.value[group] = !expanded.value[group];
}

function toggleLabel(group: PersonalSpaceGroup): string {
	return i18n.baseText(
		expanded.value[group]
			? 'instanceRoles.personalSpace.collapse'
			: 'instanceRoles.personalSpace.expand',
		{ interpolate: { group: i18n.baseText(PERSONAL_SPACE_GROUP_LABEL_KEYS[group]) } },
	);
}
</script>

<template>
	<div :class="$style.container" data-test-id="personal-space-permissions">
		<div v-for="group in PERSONAL_SPACE_GROUPS" :key="group" :class="$style.group">
			<div :class="$style.groupHeader">
				<N8nIconButton
					:icon="expanded[group] ? 'chevron-down' : 'chevron-right'"
					variant="ghost"
					size="xsmall"
					icon-size="small"
					:aria-expanded="expanded[group]"
					:aria-controls="`${listId}-${group}`"
					:aria-label="toggleLabel(group)"
					:data-test-id="`personal-space-toggle-${group}`"
					@click="toggle(group)"
				/>
				<N8nCheckbox
					:label="i18n.baseText(PERSONAL_SPACE_GROUP_LABEL_KEYS[group])"
					:model-value="true"
					disabled
					:class="$style.checkbox"
					:data-test-id="`personal-space-group-${group}`"
				/>
			</div>
			<ul
				v-show="expanded[group]"
				:id="`${listId}-${group}`"
				:class="$style.resources"
				:data-test-id="`personal-space-resources-${group}`"
			>
				<li v-for="resource in PERSONAL_SPACE_RESOURCES" :key="resource" :class="$style.resource">
					<N8nCheckbox
						:label="i18n.baseText(PERSONAL_SPACE_RESOURCE_LABEL_KEYS[resource])"
						:model-value="true"
						disabled
						:class="$style.checkbox"
						:data-test-id="`personal-space-${group}-${resource}`"
					/>
					<N8nInfoTip type="tooltip" theme="info" :bold="false" tooltip-placement="right">
						{{ i18n.baseText(PERSONAL_SPACE_TOOLTIP_KEYS[group][resource]) }}
					</N8nInfoTip>
				</li>
			</ul>
		</div>

		<N8nCallout theme="info" slim :class="$style.callout" data-test-id="personal-space-callout">
			<I18nT keypath="instanceRoles.personalSpace.callout" scope="global">
				<template #link>
					<N8nLink
						:to="{ name: VIEWS.SECURITY_SETTINGS }"
						size="small"
						theme="secondary"
						:bold="true"
						:underline="true"
					>
						{{ i18n.baseText('instanceRoles.personalSpace.callout.link') }}
					</N8nLink>
				</template>
			</I18nT>
		</N8nCallout>
	</div>
</template>

<style lang="css" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	/* Opt out of the option alignment of the parent list: the callout spans the card. */
	align-self: stretch;
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/* The chevron is an `xsmall` icon button, so the row is `--height--xs` tall. The
   instance permission rows in ScopeGroupSelector reserve the same column and
   height, so every checkbox lines up across the cards. */
.groupHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.resources {
	list-style: none;
	margin: 0;
	/* Indent under the group checkbox: chevron width plus the header gap. */
	padding: 0 0 0 calc(var(--height--xs) + var(--spacing--4xs));
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.resource {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--xs);
}

.checkbox {
	margin-bottom: 0;
}

.callout {
	margin-top: var(--spacing--2xs);
	/* The info callout is white by default. On the white card it needs the page
	   background to read as a callout. */
	--callout--color--background--info: var(--color--background);
}
</style>
