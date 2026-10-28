<script setup lang="ts">
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
</script>

<template>
	<N8nSettingsRow
		v-bind="$attrs"
		:title="title"
		:description="description"
		:max-description-lines="maxDescriptionLines"
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
						v-model="enabled"
						:disabled="disabled"
						:aria-label="title"
						:data-test-id="switchTestId"
					/>
				</N8nTooltip>
				<N8nSwitch
					v-else
					v-model="enabled"
					:disabled="disabled"
					:aria-label="title"
					:data-test-id="switchTestId"
				/>
			</slot>
		</template>
	</N8nSettingsRow>
</template>
