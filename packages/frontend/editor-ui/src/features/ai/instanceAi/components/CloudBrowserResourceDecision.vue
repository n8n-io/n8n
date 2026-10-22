<script lang="ts" setup>
import type {
	GatewayConfirmationRequiredPayload,
	InstanceGatewayResourceDecision,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { N8nApprovalCard, type ApprovalOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { redactTelemetryProperties } from '@n8n/telemetry';
import { computed } from 'vue';
import { useThread } from '../instanceAi.store';

const props = defineProps<{
	requestId: string;
	kind?: GatewayConfirmationRequiredPayload['kind'];
	resource: string;
	description: string;
	options: InstanceGatewayResourceDecision[];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const thread = useThread();

const title = computed(() =>
	props.kind === 'credential-write'
		? i18n.baseText('instanceAi.cloudBrowserConfirmation.credentialPrompt')
		: i18n.baseText('instanceAi.cloudBrowserConfirmation.hostPrompt', {
				interpolate: { host: props.resource },
			}),
);

// Same layout as the domain access card: persistent option first, deny last.
// Only the options the request offers are shown.
const approvalOptions = computed<ApprovalOption[]>(() => {
	const list: ApprovalOption[] = [];
	if (props.options.includes('allowForSession')) {
		list.push({
			key: 'allowForSession',
			icon: 'check',
			label: i18n.baseText('instanceAi.domainAccess.allowDomain', {
				interpolate: { domain: props.resource },
			}),
			suffix: i18n.baseText('instanceAi.confirmation.alwaysAllowSuffix'),
			testId: 'cloud-browser-decision-allow-session',
		});
	}
	if (props.options.includes('allowOnce')) {
		list.push({
			key: 'allowOnce',
			icon: 'check',
			label: i18n.baseText('instanceAi.domainAccess.allowOnce'),
			testId: 'cloud-browser-decision-allow-once',
		});
	}
	if (props.options.includes('denyOnce')) {
		list.push({
			key: 'denyOnce',
			icon: 'ban',
			label: i18n.baseText('instanceAi.domainAccess.deny'),
			withArrow: false,
			testId: 'cloud-browser-decision-deny',
		});
	}
	return list;
});

function onSelect(key: string) {
	const decision = props.options.find((option) => option === key);
	if (!decision) return;
	const tc = thread.findToolCallByRequestId(props.requestId);
	const eventProps = {
		thread_id: thread.id,
		input_thread_id: tc?.confirmation?.inputThreadId ?? '',
		instance_id: rootStore.instanceId,
		type: 'resource-decision',
		browser: 'cloud',
		resource_kind: props.kind ?? 'host',
		provided_inputs: [{ label: props.resource, options: props.options, option_chosen: decision }],
		skipped_inputs: [],
	};
	// Same event as the user's browser card. `resource` can be an internal host, so it goes
	// through the redaction like any other free-form value.
	telemetry.track('User finished providing input', redactTelemetryProperties(eventProps));
	void thread.confirmResourceDecision(props.requestId, decision);
}
</script>

<template>
	<N8nApprovalCard
		:title="title"
		title-size="medium"
		:description="props.description"
		:options="approvalOptions"
		@select="onSelect"
	/>
</template>
