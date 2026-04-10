<script lang="ts" setup>
import { N8nButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useInstanceAiStore } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';
import ConfirmationPreview from './ConfirmationPreview.vue';
import SplitButton from './SplitButton.vue';

const props = defineProps<{
	requestId: string;
	resource: string;
	description: string;
	options: string[];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const store = useInstanceAiStore();

interface OptionEntry {
	decision: string;
	label: string;
}

const DECISION_LABELS: Record<string, string> = {
	allowOnce: i18n.baseText('instanceAi.gatewayConfirmation.allowOnce'),
	allowForSession: i18n.baseText('instanceAi.gatewayConfirmation.allowForSession'),
	alwaysAllow: i18n.baseText('instanceAi.gatewayConfirmation.alwaysAllow'),
	denyOnce: i18n.baseText('instanceAi.gatewayConfirmation.denyOnce'),
	alwaysDeny: i18n.baseText('instanceAi.gatewayConfirmation.alwaysDeny'),
};

const KNOWN_DECISIONS = new Set(Object.keys(DECISION_LABELS));

function getDecisionLabel(decision: string): string {
	return DECISION_LABELS[decision] ?? decision;
}

function optionEntry(decision: string): OptionEntry {
	return { decision, label: getDecisionLabel(decision) };
}

const denyPrimary = computed(() =>
	props.options.includes('denyOnce') ? optionEntry('denyOnce') : undefined,
);

const denyDropdownItems = computed(() => {
	const items: Array<ActionDropdownItem<string>> = [];
	if (props.options.includes('alwaysDeny'))
		items.push({ id: 'alwaysDeny', label: getDecisionLabel('alwaysDeny') });
	return items;
});

const approvePrimary = computed(() =>
	props.options.includes('allowForSession') ? optionEntry('allowForSession') : undefined,
);

const approveDropdownItems = computed(() => {
	const items: Array<ActionDropdownItem<string>> = [];
	if (props.options.includes('allowOnce'))
		items.push({ id: 'allowOnce', label: getDecisionLabel('allowOnce') });
	if (props.options.includes('alwaysAllow'))
		items.push({ id: 'alwaysAllow', label: getDecisionLabel('alwaysAllow') });
	return items;
});

const otherOptions = computed<OptionEntry[]>(() =>
	props.options.filter((d) => !KNOWN_DECISIONS.has(d)).map(optionEntry),
);

async function confirm(decision: string) {
	const tc = store.findToolCallByRequestId(props.requestId);
	const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
	const eventProps = {
		thread_id: store.currentThreadId,
		input_thread_id: inputThreadId,
		instance_id: rootStore.instanceId,
		type: 'resource-decision',
		provided_inputs: [{ label: props.resource, options: props.options, option_chosen: decision }],
		skipped_inputs: [],
	};
	telemetry.track('User finished providing input', eventProps);
	await store.confirmResourceDecision(props.requestId, decision);
}
</script>

<template>
	<div :class="$style.root">
		<div :class="$style.body">
			<N8nText tag="div" size="medium" bold>
				{{
					i18n.baseText('instanceAi.gatewayConfirmation.prompt', {
						interpolate: { resources: props.resource },
					})
				}}
			</N8nText>
			<ConfirmationPreview>{{ props.description }}</ConfirmationPreview>
		</div>

		<ConfirmationFooter>
			<!-- Unknown options not in the standard set -->
			<N8nButton
				v-for="opt in otherOptions"
				:key="opt.decision"
				variant="outline"
				size="small"
				:label="opt.label"
				@click="confirm(opt.decision)"
			/>

			<!-- Deny side -->
			<template v-if="denyPrimary">
				<SplitButton
					variant="outline"
					:label="denyPrimary.label"
					:items="denyDropdownItems"
					data-test-id="gateway-decision-deny"
					caret-aria-label="More deny options"
					@click="confirm(denyPrimary.decision)"
					@select="confirm"
				/>
			</template>

			<!-- Approve side -->
			<template v-if="approvePrimary">
				<SplitButton
					variant="solid"
					:label="approvePrimary.label"
					:items="approveDropdownItems"
					data-test-id="gateway-decision-approve"
					caret-aria-label="More approve options"
					@click="confirm(approvePrimary.decision)"
					@select="confirm"
				/>
			</template>
		</ConfirmationFooter>
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
}

.body {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
