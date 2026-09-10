<script setup lang="ts">
import { computed, reactive } from 'vue';
import { N8nButton, N8nCheckbox, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useApplyGatewayCredential } from '../composables/useApplyGatewayCredential';
import type {
	GatewayOpportunity,
	GatewayOpportunityCaveat,
} from '../composables/useWorkflowGatewayScan';

const props = defineProps<{
	modalName: string;
	data: {
		opportunities: GatewayOpportunity[];
		workflowId: string;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const toast = useToast();
const telemetry = useTelemetry();
const credentialsStore = useCredentialsStore();
const { applyToNodes } = useApplyGatewayCredential();

// A clean row starts checked: the modal is the one-click-equivalent path — the
// user deselects a node instead of opting in one at a time. A caveated row
// starts unchecked instead: its current configuration is not supported, so
// switching it now could break the node, and the user must opt in deliberately.
const selected = reactive<Record<string, boolean>>(
	Object.fromEntries(
		props.data.opportunities.map((opportunity) => [opportunity.nodeName, !opportunity.caveat]),
	),
);

// Clean rows first: they are the ones the user can switch without thought.
// `sort` is stable, so each group keeps its workflow order.
const orderedOpportunities = computed(() =>
	[...props.data.opportunities].sort(
		(a, b) => Number(Boolean(a.caveat)) - Number(Boolean(b.caveat)),
	),
);

const selectedOpportunities = computed(() =>
	props.data.opportunities.filter((opportunity) => selected[opportunity.nodeName]),
);
const selectedCount = computed(() => selectedOpportunities.value.length);

const CAVEAT_MESSAGE_KEYS: Record<GatewayOpportunityCaveat, BaseTextKey> = {
	unsupportedModel: 'aiGateway.switchModal.row.caveat.unsupportedModel',
	unsupportedAction: 'aiGateway.switchModal.row.caveat.unsupportedAction',
	hiddenPropertySet: 'aiGateway.switchModal.row.caveat.hiddenPropertySet',
};

function caveatMessage(opportunity: GatewayOpportunity): string | undefined {
	return opportunity.caveat ? i18n.baseText(CAVEAT_MESSAGE_KEYS[opportunity.caveat]) : undefined;
}

function hasAuthChange(opportunity: GatewayOpportunity): boolean {
	return Object.keys(opportunity.activationParameters).length > 0;
}

function credentialLabel(credentialType: string): string {
	return credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
}

function closeModal(): void {
	uiStore.closeModal(props.modalName);
}

function showResultToast(appliedCount: number, failedCount: number): void {
	const parts: string[] = [];

	if (appliedCount > 0) {
		parts.push(
			i18n.baseText('aiGateway.switchModal.result.appliedCount', {
				adjustToNumber: appliedCount,
				interpolate: { count: appliedCount },
			}),
		);
		// Only nudge to save when something in the workflow actually changed.
		parts.push(i18n.baseText('aiGateway.switchModal.result.unsavedChanges'));
	}
	if (failedCount > 0) {
		parts.push(
			i18n.baseText('aiGateway.switchModal.result.failedCount', {
				adjustToNumber: failedCount,
				interpolate: { count: failedCount },
			}),
		);
	}

	toast.showMessage({
		title: i18n.baseText(
			failedCount > 0
				? 'aiGateway.switchModal.result.partial.title'
				: 'aiGateway.switchModal.result.success.title',
		),
		message: parts.join(' '),
		type: failedCount > 0 ? 'warning' : 'success',
	});
}

function confirm(): void {
	const opportunities = selectedOpportunities.value;
	const { applied, failed } = applyToNodes(opportunities);
	const caveatedSelectedCount = opportunities.filter((opportunity) => opportunity.caveat).length;

	telemetry.track(TELEMETRY_EVENT.GATEWAY.SWITCH_APPLIED, {
		workflow_id: props.data.workflowId,
		selected_count: opportunities.length,
		applied_count: applied.length,
		failed_count: failed.length,
		caveated_selected_count: caveatedSelectedCount,
	});

	closeModal();
	showResultToast(applied.length, failed.length);
}
</script>

<template>
	<Modal width="480px" :name="props.modalName" data-test-id="gateway-opportunity-switch-modal">
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{ i18n.baseText('aiGateway.switchModal.title') }}
			</N8nHeading>
		</template>
		<template #content>
			<N8nText tag="p" color="text-base" class="mb-m">
				{{ i18n.baseText('aiGateway.switchModal.description') }}
			</N8nText>
			<ul :class="$style.list">
				<li
					v-for="(opportunity, index) in orderedOpportunities"
					:key="opportunity.nodeName"
					:class="$style.row"
					:data-test-id="`gateway-opportunity-switch-row-${index}`"
				>
					<N8nCheckbox
						v-model="selected[opportunity.nodeName]"
						:data-test-id="`gateway-opportunity-switch-checkbox-${index}`"
					>
						<template #label>
							<N8nText tag="span" color="text-dark">{{ opportunity.nodeName }}</N8nText>
							<N8nText tag="span" size="small" color="text-light" :class="$style.credentialType">
								{{ credentialLabel(opportunity.credentialType) }}
							</N8nText>
						</template>
					</N8nCheckbox>
					<div
						v-if="opportunity.caveat"
						:class="$style.hint"
						data-test-id="gateway-opportunity-switch-caveat-warning"
					>
						<N8nIcon icon="triangle-alert" size="small" color="warning" />
						<N8nText tag="span" size="small" color="warning">
							{{ caveatMessage(opportunity) }}
						</N8nText>
					</div>
					<div
						v-if="hasAuthChange(opportunity)"
						:class="$style.hint"
						data-test-id="gateway-opportunity-switch-auth-hint"
					>
						<N8nIcon icon="info" size="small" color="text-light" />
						<N8nText tag="span" size="small" color="text-light">
							{{ i18n.baseText('aiGateway.switchModal.row.authHint') }}
						</N8nText>
					</div>
				</li>
			</ul>
		</template>
		<template #footer>
			<div :class="$style.buttons">
				<N8nButton variant="ghost" class="mr-2xs" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="selectedCount === 0"
					data-test-id="gateway-opportunity-switch-confirm"
					@click="confirm"
				>
					{{
						i18n.baseText('aiGateway.switchModal.confirm', {
							adjustToNumber: selectedCount,
							interpolate: { count: selectedCount },
						})
					}}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	list-style: none;
	padding: 0;
	margin: 0;
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.credentialType {
	margin-left: var(--spacing--2xs);
}

.hint {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-left: var(--spacing--lg);
}

.buttons {
	display: flex;
	justify-content: flex-end;
}
</style>
