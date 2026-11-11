<script setup lang="ts">
import { useId } from 'vue';

import N8nEnterpriseReadinessBadge from '../EnterpriseReadinessBadge/EnterpriseReadinessBadge.vue';
import N8nPreviewBadge from '../PreviewBadge/PreviewBadge.vue';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSwitch from '../N8nSwitch';

export interface SettingsEnableRowProps {
	/** Row title. The switch uses it as its accessible name. */
	title: string;
	/** Short description under the title. */
	description?: string;
	/**
	 * Disables the switch.
	 * @default false
	 */
	disabled?: boolean;
	/** Test id for the switch. */
	switchTestId?: string;
	/**
	 * Shows the Preview badge beside the title.
	 * A later change replaces this flag and `showEnterpriseReadinessBadge` with a feature id.
	 * FeatureBadge then reads the feature status from a central list.
	 * @default false
	 */
	showPreviewBadge?: boolean;
	/**
	 * Shows the Limited enterprise support badge beside the title.
	 * @default false
	 */
	showEnterpriseReadinessBadge?: boolean;
}

defineOptions({ name: 'N8nSettingsEnableRow', inheritAttrs: false });

withDefaults(defineProps<SettingsEnableRowProps>(), {
	description: undefined,
	disabled: false,
	switchTestId: undefined,
	showPreviewBadge: false,
	showEnterpriseReadinessBadge: false,
});

const enabled = defineModel<boolean>({ default: false });

const switchId = useId();

const settingsSwitchProps = {
	size: 'large',
} as const;
</script>

<template>
	<N8nSettingsRow v-bind="$attrs" :title="title" :description="description" :label-for="switchId">
		<template v-if="showPreviewBadge || showEnterpriseReadinessBadge" #titleTrailing>
			<N8nPreviewBadge v-if="showPreviewBadge" data-test-id="settings-enable-row-preview-badge" />
			<N8nEnterpriseReadinessBadge
				v-if="showEnterpriseReadinessBadge"
				data-test-id="settings-enable-row-enterprise-readiness-badge"
			/>
		</template>
		<template #action>
			<N8nSwitch
				v-bind="settingsSwitchProps"
				:id="switchId"
				v-model="enabled"
				:disabled="disabled"
				:aria-label="title"
				:data-test-id="switchTestId"
			/>
		</template>
	</N8nSettingsRow>
</template>
