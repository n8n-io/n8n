<script lang="ts" setup>
import { N8nButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useThread } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';
import ConfirmationPreview from './ConfirmationPreview.vue';
import SplitButton from './SplitButton.vue';

type InstanceGatewayResourceDecision = 'denyOnce' | 'allowOnce' | 'allowForSession';

const INSTANCE_GATEWAY_RESOURCE_DECISIONS = [
	'denyOnce',
	'allowOnce',
	'allowForSession',
] as const satisfies readonly InstanceGatewayResourceDecision[];

function isInstanceGatewayResourceDecision(
	value: string,
): value is InstanceGatewayResourceDecision {
	return (INSTANCE_GATEWAY_RESOURCE_DECISIONS as readonly string[]).includes(value);
}

const props = defineProps<{
	requestId: string;
	resource: string;
	description: string;
	options: InstanceGatewayResourceDecision[];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const thread = useThread();

interface OptionEntry {
	decision: InstanceGatewayResourceDecision;
	label: string;
}

const DECISION_LABELS: Record<InstanceGatewayResourceDecision, string> = {
	allowOnce: i18n.baseText('instanceAi.gatewayConfirmation.allowOnce'),
	allowForSession: i18n.baseText('instanceAi.gatewayConfirmation.allowForSession'),
	denyOnce: i18n.baseText('instanceAi.gatewayConfirmation.denyOnce'),
};

function getDecisionLabel(decision: InstanceGatewayResourceDecision): string {
	return DECISION_LABELS[decision];
}

function optionEntry(decision: InstanceGatewayResourceDecision): OptionEntry {
	return { decision, label: getDecisionLabel(decision) };
}

const denyPrimary = computed(() =>
	props.options.includes('denyOnce') ? optionEntry('denyOnce') : undefined,
);

const approvePrimary = computed(() =>
	props.options.includes('allowOnce') ? optionEntry('allowOnce') : undefined,
);

const approveDropdownItems = computed(() => {
	const items: Array<ActionDropdownItem<InstanceGatewayResourceDecision>> = [];
	if (props.options.includes('allowForSession'))
		items.push({ id: 'allowForSession', label: getDecisionLabel('allowForSession') });
	return items;
});

async function confirm(decision: InstanceGatewayResourceDecision) {
	const tc = thread.findToolCallByRequestId(props.requestId);
	const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
	const eventProps = {
		thread_id: thread.currentThreadId,
		input_thread_id: inputThreadId,
		instance_id: rootStore.instanceId,
		type: 'resource-decision',
		provided_inputs: [{ label: props.resource, options: props.options, option_chosen: decision }],
		skipped_inputs: [],
	};
	telemetry.track('User finished providing input', eventProps);
	await thread.confirmResourceDecision(props.requestId, decision);
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
			<!-- Deny side -->
			<N8nButton
				v-if="denyPrimary"
				variant="outline"
				size="medium"
				:label="denyPrimary.label"
				data-test-id="gateway-decision-deny"
				@click="confirm(denyPrimary.decision)"
			/>

			<!-- Approve side -->
			<template v-if="approvePrimary">
				<SplitButton
					variant="solid"
					:label="approvePrimary.label"
					:items="approveDropdownItems"
					data-test-id="gateway-decision-approve"
					caret-aria-label="More approve options"
					@click="confirm(approvePrimary.decision)"
					@select="(id: string) => isInstanceGatewayResourceDecision(id) && confirm(id)"
				/>
			</template>
		</ConfirmationFooter>
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.body {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
