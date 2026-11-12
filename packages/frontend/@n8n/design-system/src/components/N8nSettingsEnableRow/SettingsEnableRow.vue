<script setup lang="ts">
import { computed, useId } from 'vue';

import N8nEnterpriseReadinessBadge from '../EnterpriseReadinessBadge/EnterpriseReadinessBadge.vue';
import N8nPreviewBadge from '../PreviewBadge/PreviewBadge.vue';
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
	 * Shows the Preview badge beside the title.
	 * @default false
	 */
	showPreviewBadge?: boolean;
	/**
	 * Shows the Limited enterprise support badge beside the title.
	 * @default false
	 */
	showEnterpriseReadinessBadge?: boolean;
}

defineOptions({ name: 'N8nSettingsEnableRow' });

const props = withDefaults(defineProps<SettingsEnableRowProps>(), {
	disabled: false,
	switchTestId: undefined,
	showPreviewBadge: false,
	showEnterpriseReadinessBadge: false,
});

const enabled = defineModel<boolean>({ default: false });

const switchId = useId();
const hasBadges = computed(() => props.showPreviewBadge || props.showEnterpriseReadinessBadge);

const settingsSwitchProps = {
	size: 'small',
} as const;
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
				<span v-if="hasBadges" :class="$style.badges">
					<N8nPreviewBadge
						v-if="showPreviewBadge"
						data-test-id="settings-enable-row-preview-badge"
					/>
					<N8nEnterpriseReadinessBadge
						v-if="showEnterpriseReadinessBadge"
						data-test-id="settings-enable-row-enterprise-readiness-badge"
					/>
				</span>
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
			v-model="enabled"
			:disabled="disabled"
			:aria-label="title"
			:data-test-id="switchTestId"
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

.badges {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
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
