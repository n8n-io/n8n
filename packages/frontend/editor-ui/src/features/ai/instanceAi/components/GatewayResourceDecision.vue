<script lang="ts" setup>
import { N8nButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { redactTelemetryProperties } from '@n8n/telemetry';
import { useThread } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';
import ConfirmationPreview from './ConfirmationPreview.vue';
import SplitButton from './SplitButton.vue';

type InstanceGatewayResourceDecision =
	| 'denyOnce'
	| 'allowOnce'
	| 'allowForSession'
	| 'useLocalBrowserForChat'
	| 'useLocalBrowserAlways'
	| 'useCloudBrowserForChat'
	| 'useCloudBrowserAlways'
	| 'continueAfterTakeover';

const INSTANCE_GATEWAY_RESOURCE_DECISIONS = [
	'denyOnce',
	'allowOnce',
	'allowForSession',
	'useLocalBrowserForChat',
	'useLocalBrowserAlways',
	'useCloudBrowserForChat',
	'useCloudBrowserAlways',
	'continueAfterTakeover',
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
	useLocalBrowserForChat: i18n.baseText('instanceAi.gatewayConfirmation.useLocalBrowserForChat'),
	useLocalBrowserAlways: i18n.baseText('instanceAi.gatewayConfirmation.useLocalBrowserAlways'),
	useCloudBrowserForChat: i18n.baseText('instanceAi.gatewayConfirmation.useCloudBrowserForChat'),
	useCloudBrowserAlways: i18n.baseText('instanceAi.gatewayConfirmation.useCloudBrowserAlways'),
	continueAfterTakeover: i18n.baseText('instanceAi.gatewayConfirmation.continueAfterTakeover'),
};

/** The agent handed the cloud browser to the user for a step only they can do. */
const isTakeover = computed(() => props.options.includes('continueAfterTakeover'));

/** Each browser offered for this chat, with "always" in its dropdown. */
const BROWSER_CHOICES = [
	{ forChat: 'useLocalBrowserForChat', always: 'useLocalBrowserAlways', testId: 'local' },
	{ forChat: 'useCloudBrowserForChat', always: 'useCloudBrowserAlways', testId: 'cloud' },
] as const;

const browserChoices = computed(() =>
	BROWSER_CHOICES.filter((choice) => props.options.includes(choice.forChat)).map((choice) => ({
		primary: optionEntry(choice.forChat),
		items: props.options.includes(choice.always)
			? [{ id: choice.always, label: getDecisionLabel(choice.always) }]
			: [],
		testId: choice.testId,
	})),
);

function getDecisionLabel(decision: InstanceGatewayResourceDecision): string {
	return DECISION_LABELS[decision];
}

function optionEntry(decision: InstanceGatewayResourceDecision): OptionEntry {
	return { decision, label: getDecisionLabel(decision) };
}

const denyPrimary = computed(() => {
	if (!props.options.includes('denyOnce')) return undefined;
	return isTakeover.value
		? {
				decision: 'denyOnce' as const,
				label: i18n.baseText('instanceAi.gatewayConfirmation.cancelTakeover'),
			}
		: optionEntry('denyOnce');
});

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
		thread_id: thread.id,
		input_thread_id: inputThreadId,
		instance_id: rootStore.instanceId,
		type: 'resource-decision',
		provided_inputs: [{ label: props.resource, options: props.options, option_chosen: decision }],
		skipped_inputs: [],
	};
	// `resource` is the host the agent asked to reach — can be an internal
	// hostname or a URL, so it goes through the egress policy like any other
	// free-form value.
	telemetry.track('User finished providing input', redactTelemetryProperties(eventProps));
	await thread.confirmResourceDecision(props.requestId, decision);
}
</script>

<template>
	<div :class="$style.root">
		<div :class="$style.body">
			<N8nText tag="div" size="medium" bold>
				{{
					isTakeover
						? i18n.baseText('instanceAi.gatewayConfirmation.takeoverPrompt')
						: browserChoices.length > 0
							? i18n.baseText('instanceAi.gatewayConfirmation.browserChoicePrompt')
							: i18n.baseText('instanceAi.gatewayConfirmation.prompt', {
									interpolate: { resources: props.resource },
								})
				}}
			</N8nText>
			<ConfirmationPreview v-if="browserChoices.length === 0">{{
				props.description
			}}</ConfirmationPreview>
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

			<!-- Browser choice -->
			<SplitButton
				v-for="choice in browserChoices"
				:key="choice.testId"
				variant="outline"
				:label="choice.primary.label"
				:items="choice.items"
				:data-test-id="`gateway-decision-browser-${choice.testId}`"
				caret-aria-label="More browser options"
				@click="confirm(choice.primary.decision)"
				@select="(id: string) => isInstanceGatewayResourceDecision(id) && confirm(id)"
			/>

			<N8nButton
				v-if="isTakeover"
				variant="solid"
				size="medium"
				:label="getDecisionLabel('continueAfterTakeover')"
				data-test-id="gateway-decision-continue-after-takeover"
				@click="confirm('continueAfterTakeover')"
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
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--sm), var(--shadow--outline);
}

.body {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
