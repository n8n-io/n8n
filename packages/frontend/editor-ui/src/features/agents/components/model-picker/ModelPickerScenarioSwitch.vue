<script setup lang="ts">
/**
 * ponytail: prototype-only. A small menu at the bottom of the page that swaps the
 * walkthrough scenario, like the scenario menu of the earlier HTML prototype.
 */
import {
	N8nButton,
	N8nCheckbox,
	N8nDropdownMenu,
	N8nIcon,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	MODEL_PICKER_SCENARIOS,
	useModelPickerScenario,
	type ModelPickerScenarioId,
} from './modelPickerScenarios';
import { useStandInGateway } from './useStandInGateway';

const SKIP_KEY_CHECK = 'skipKeyCheck';

const i18n = useI18n();
const { scenario, skipKeyCheck, showsCurrentPicker } = useModelPickerScenario();
// This menu is on screen whenever the prototype is, so it also runs the scenario's stand-ins.
useStandInGateway(showsCurrentPicker);

const items = computed<DropdownMenuItemProps[]>(() => [
	{
		id: 'header',
		label: i18n.baseText('agents.modelPicker.scenario.menu'),
		header: true,
		disabled: true,
	},
	...(Object.keys(MODEL_PICKER_SCENARIOS) as ModelPickerScenarioId[]).map((id) => ({
		id,
		label: i18n.baseText(MODEL_PICKER_SCENARIOS[id].labelKey),
		checked: scenario.value === id,
	})),
	{
		id: SKIP_KEY_CHECK,
		label: i18n.baseText('agents.modelPicker.scenario.skipKeyCheck'),
		checkbox: true,
		checked: skipKeyCheck.value,
		keepOpen: true,
		divided: true,
	},
]);

function onSelect(id: string) {
	if (id === SKIP_KEY_CHECK) {
		skipKeyCheck.value = !skipKeyCheck.value;
		return;
	}
	if (id in MODEL_PICKER_SCENARIOS) scenario.value = id as ModelPickerScenarioId;
}
</script>

<template>
	<Teleport to="body">
		<div :class="$style.switch">
			<N8nDropdownMenu :items="items" placement="top" @select="onSelect">
				<template #trigger>
					<N8nButton variant="outline" size="small" data-testid="agent-model-picker-scenario">
						{{
							i18n.baseText('agents.modelPicker.scenario.label', {
								interpolate: {
									name: i18n.baseText(MODEL_PICKER_SCENARIOS[scenario].labelKey),
								},
							})
						}}
						<N8nIcon icon="chevron-up" size="small" />
					</N8nButton>
				</template>
				<template #item-leading="{ item, ui }">
					<!-- The menu item owns the checked state. This box only shows it, like the Features filter. -->
					<N8nCheckbox
						v-if="item.checkbox"
						:model-value="item.checked"
						:class="[ui.class, $style.passive]"
						tabindex="-1"
						aria-hidden="true"
					/>
				</template>
			</N8nDropdownMenu>
		</div>
	</Teleport>
</template>

<style module lang="scss">
.passive {
	pointer-events: none;
}

/* Bottom centre, clear of the sidebar, the toasts, and the chat button. */
.switch {
	position: fixed;
	bottom: var(--spacing--sm);
	left: 50%;
	z-index: 10;
	transform: translateX(-50%);
}
</style>
