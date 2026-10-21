<script lang="ts" setup>
import type {
	GatewayConfirmationRequiredPayload,
	InstanceGatewayResourceDecision,
} from '@n8n/api-types';
import { N8nApprovalCard, type ApprovalOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
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
	if (decision) void thread.confirmResourceDecision(props.requestId, decision);
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
