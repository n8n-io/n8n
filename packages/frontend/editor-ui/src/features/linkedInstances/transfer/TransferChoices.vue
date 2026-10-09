<script setup lang="ts">
import { N8nCheckbox, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import type { TransferHint, TransferOptions } from './transferDialogState';

/** The choices of the move dialog, and the lines that tell what the picked choices do. */
const props = defineProps<{
	options: TransferOptions;
	hints: TransferHint[];
	/** The name of the link. */
	place: string;
	disabled: boolean;
}>();

const turnOffHere = defineModel<boolean>('turnOffHere', { required: true });
const turnOn = defineModel<boolean>('turnOn', { required: true });

const HINT_TEXT: Record<TransferHint, BaseTextKey> = {
	turnsOffHere: 'linkedInstances.transfer.hint.turnsOffHere',
	notLiveUntilSetUp: 'linkedInstances.transfer.hint.notLiveUntilSetUp',
	staysOnHere: 'linkedInstances.transfer.hint.staysOnHere',
	nodeTypesUnchecked: 'linkedInstances.transfer.hint.nodeTypesUnchecked',
	nodeTypesUncheckedStaysOnHere: 'linkedInstances.transfer.hint.nodeTypesUncheckedStaysOnHere',
};

const i18n = useI18n();
const interpolate = computed(() => ({ place: props.place }));
</script>

<template>
	<div :class="$style.choices">
		<section v-if="options.showTurnOffHere" :class="$style.choice">
			<N8nText tag="h3" size="small" bold>
				{{ i18n.baseText('linkedInstances.transfer.copyHere.heading') }}
			</N8nText>
			<N8nCheckbox
				v-model="turnOffHere"
				:label="i18n.baseText('linkedInstances.transfer.copyHere.turnOff')"
				:disabled="disabled"
				data-test-id="transfer-turn-off-here"
			/>
		</section>
		<section v-if="options.showTurnOn" :class="$style.choice">
			<N8nText tag="h3" size="small" bold>
				{{ i18n.baseText('linkedInstances.transfer.copyThere.heading', { interpolate }) }}
			</N8nText>
			<N8nCheckbox
				v-model="turnOn"
				:label="i18n.baseText('linkedInstances.transfer.copyThere.turnOn', { interpolate })"
				:disabled="disabled"
				data-test-id="transfer-turn-on"
			/>
		</section>

		<!-- The region is in the page before a choice changes, so screen readers read each new hint. -->
		<div aria-live="polite" :class="$style.hints" data-test-id="transfer-hints">
			<N8nText
				v-for="hint in hints"
				:key="hint"
				tag="p"
				size="small"
				color="text-base"
				:data-test-id="`transfer-hint-${hint}`"
			>
				{{ i18n.baseText(HINT_TEXT[hint], { interpolate }) }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.choices {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.choice {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.hints {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);

	// An empty live region stays in the page for screen readers, but out of the layout.
	&:not(:has(> *)) {
		position: absolute;
	}
}
</style>
