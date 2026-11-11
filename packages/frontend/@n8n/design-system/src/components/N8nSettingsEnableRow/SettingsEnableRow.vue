<script setup lang="ts">
import { useId } from 'vue';

import N8nSettingsRow from '../N8nSettingsRow';
import N8nSwitch from '../N8nSwitch';
import N8nTooltip from '../N8nTooltip';

export interface SettingsEnableRowProps {
	/** Row title. The switch uses it as its accessible name. */
	title: string;
	/** Short description under the title. */
	description?: string;
	/** Disables the switch. */
	disabled?: boolean;
	/** Tooltip shown while the switch is disabled. */
	disabledTooltip?: string;
	/** Test id for the switch. */
	switchTestId?: string;
	/** Passed through to the row. The row default is 2 lines, and the hard maximum is 3. */
	maxDescriptionLines?: number;
}

defineOptions({ name: 'N8nSettingsEnableRow', inheritAttrs: false });

withDefaults(defineProps<SettingsEnableRowProps>(), {
	description: undefined,
	disabled: false,
	disabledTooltip: undefined,
	switchTestId: undefined,
	maxDescriptionLines: undefined,
});

const enabled = defineModel<boolean>({ default: false });

const slots = defineSlots<{
	titleTrailing?: () => unknown;
	action?: () => unknown;
}>();

const switchId = useId();

// `size` stays large. The small switch is the parameter control.
const settingsSwitchProps = {
	size: 'large',
} as const;
</script>

<template>
	<N8nSettingsRow
		v-bind="$attrs"
		:title="title"
		:description="description"
		:max-description-lines="maxDescriptionLines"
		:label-for="slots.action ? undefined : switchId"
	>
		<template v-if="$slots.titleTrailing" #titleTrailing>
			<slot name="titleTrailing" />
		</template>
		<template #action>
			<slot name="action">
				<N8nTooltip
					v-if="disabledTooltip"
					:content="disabledTooltip"
					:disabled="!disabled"
					placement="top"
				>
					<N8nSwitch
						v-bind="settingsSwitchProps"
						:id="switchId"
						v-model="enabled"
						:disabled="disabled"
						:aria-label="title"
						:data-test-id="switchTestId"
					/>
				</N8nTooltip>
				<N8nSwitch
					v-else
					v-bind="settingsSwitchProps"
					:id="switchId"
					v-model="enabled"
					:disabled="disabled"
					:aria-label="title"
					:data-test-id="switchTestId"
				/>
			</slot>
		</template>
	</N8nSettingsRow>
</template>
