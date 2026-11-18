<script setup lang="ts">
import { computed, useId } from 'vue';

import N8nFeatureMaturityBadges from '../N8nFeatureMaturityBadges';
import {
	resolveFeatureMaturityBadges,
	useFeatureMaturityCatalog,
} from '../N8nFeatureMaturityBadges/featureMaturityState';
import N8nSwitch from '../N8nSwitch';
import N8nText from '../N8nText';

export interface SettingsEnableRowProps {
	/** Row title. The switch uses it as its accessible name. */
	title: string;
	/** Short description under the title. */
	description: string;
	/**
	 * Disables the switch.
	 * @default false
	 */
	disabled?: boolean;
	/** Test id for the switch. */
	switchTestId?: string;
	/**
	 * Feature id from the list the app provides.
	 * The entry decides which badges render beside the title.
	 */
	feature?: string;
	/** Hide the Preview badge at this callsite. */
	/** @default false */
	hidePreview?: boolean;
	/** Hide the Limited enterprise readiness badge at this callsite. */
	/** @default false */
	hideEnterprise?: boolean;
	/**
	 * Whether the setting is on.
	 * The parent owns this value.
	 * @default false
	 */
	enabled?: boolean;
}

export interface SettingsEnableRowEmits {
	/**
	 * The user turned the setting on or off.
	 * The payload is the next value.
	 */
	'update:enabled': [value: boolean];
}

defineOptions({ name: 'N8nSettingsEnableRow' });

const props = withDefaults(defineProps<SettingsEnableRowProps>(), {
	disabled: false,
	switchTestId: undefined,
	feature: undefined,
	hidePreview: false,
	hideEnterprise: false,
	enabled: false,
});

const emit = defineEmits<SettingsEnableRowEmits>();

const switchId = useId();
const catalog = useFeatureMaturityCatalog();
const featureBadges = computed(() =>
	resolveFeatureMaturityBadges(catalog.value, props.feature, {
		preview: props.hidePreview,
		enterprise: props.hideEnterprise,
	}),
);
const hasBadges = computed(
	() => featureBadges.value.showPreview || featureBadges.value.showEnterprise,
);

const settingsSwitchProps = {
	size: 'small',
} as const;

function onEnabledChange(value: boolean) {
	emit('update:enabled', value);
}
</script>

<template>
	<div :class="$style.row">
		<div :class="[$style.text, hasBadges && $style.withBadges]">
			<div :class="$style.header">
				<label :for="switchId">
					<N8nText :class="$style.title" bold size="medium" color="text-dark">
						{{ title }}
					</N8nText>
				</label>
				<N8nFeatureMaturityBadges
					v-if="feature && hasBadges"
					:feature="feature"
					:hide-preview="hidePreview"
					:hide-enterprise="hideEnterprise"
				/>
			</div>
			<label :for="switchId">
				<N8nText :class="$style.description" size="small" color="text-light">
					{{ description }}
				</N8nText>
			</label>
		</div>
		<N8nSwitch
			v-bind="settingsSwitchProps"
			:id="switchId"
			:model-value="enabled"
			:disabled="disabled"
			:aria-label="title"
			:data-test-id="switchTestId"
			@update:model-value="onEnabledChange"
		/>
		<span :class="$style.divider" data-test-id="settings-row-divider" aria-hidden="true" />
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/breakpoints' as breakpoints;

.row {
	position: relative;
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: center;
	justify-content: space-between;
	column-gap: var(--spacing--2xs);
	row-gap: var(--spacing--xs);
	padding: var(--spacing--sm);

	@include breakpoints.breakpoint('xs-only') {
		flex-wrap: wrap;
	}
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);

	&.withBadges {
		gap: var(--spacing--2xs);
	}
}

.header {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.title,
.description {
	cursor: pointer;
}

.divider {
	position: absolute;
	bottom: 0;
	left: var(--spacing--sm);
	right: var(--spacing--sm);
	height: 1px;
	background: var(--border-color--subtle);
}
</style>
