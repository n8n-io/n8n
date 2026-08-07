<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, CLOUD_N8N_CONNECT_TOP_UP_PATH } from '@/app/constants';
import Modal from '@/app/components/Modal.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';

const i18n = useI18n();
const usersStore = useUsersStore();
const cloudPlanStore = useCloudPlanStore();
const settingsStore = useSettingsStore();
const { goToUpgrade } = usePageRedirectionHelper();

type TopUpVariant = 'member' | 'memberTrial' | 'owner' | 'ownerTrial';

const COVERED_SERVICES = [
	{ credentialType: 'openAiApi', labelKey: 'aiGateway.topUp.modal.service.openAi' },
	{ credentialType: 'anthropicApi', labelKey: 'aiGateway.topUp.modal.service.anthropic' },
	{ credentialType: 'googlePalmApi', labelKey: 'aiGateway.topUp.modal.service.google' },
	{ credentialType: 'firecrawlApi', labelKey: 'aiGateway.topUp.modal.service.firecrawl' },
	{ credentialType: 'browserbaseApi', labelKey: 'aiGateway.topUp.modal.service.browserbase' },
] as const satisfies ReadonlyArray<{ credentialType: string; labelKey: BaseTextKey }>;

const variant = computed<TopUpVariant>(() => {
	if (usersStore.isInstanceOwner) {
		return cloudPlanStore.userIsTrialing ? 'ownerTrial' : 'owner';
	}
	return cloudPlanStore.userIsTrialing ? 'memberTrial' : 'member';
});

const title = computed(() => {
	switch (variant.value) {
		case 'owner':
			return i18n.baseText('aiGateway.topUp.modal.title.owner');
		case 'member':
			return i18n.baseText('aiGateway.topUp.modal.title.member');
		case 'ownerTrial':
		case 'memberTrial':
			return i18n.baseText('aiGateway.topUp.modal.title.trial');
		default: {
			const _exhaustive: never = variant.value;
			return _exhaustive;
		}
	}
});

const description = computed(() => {
	switch (variant.value) {
		case 'owner':
			return i18n.baseText('aiGateway.topUp.modal.description.owner');
		case 'ownerTrial':
			return i18n.baseText('aiGateway.topUp.modal.description.owner.trial');
		case 'memberTrial':
			return i18n.baseText('aiGateway.topUp.modal.description.member.trial');
		case 'member':
			return i18n.baseText('aiGateway.topUp.modal.description.member');
		default: {
			const _exhaustive: never = variant.value;
			return _exhaustive;
		}
	}
});

const showUpgradeCta = computed(() => variant.value === 'ownerTrial');
const showAdminPanelCta = computed(
	() => variant.value === 'owner' && settingsStore.isCloudDeployment,
);

async function onUpgrade(close: () => void): Promise<void> {
	close();
	await goToUpgrade('ai-gateway-top-up', 'upgrade-ai-gateway-top-up');
}

async function onOpenAdminPanel(close: () => void): Promise<void> {
	close();
	const link = await cloudPlanStore.generateCloudDashboardAutoLoginLink({
		redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
	});
	window.open(link, '_blank', 'noopener');
}
</script>

<template>
	<Modal
		:name="AI_GATEWAY_TOP_UP_MODAL_KEY"
		width="520px"
		custom-class="ai-gateway-topup-dialog"
		data-test-id="ai-gateway-topup-modal"
	>
		<template #content>
			<div :class="$style.body">
				<N8nIcon
					:icon="showUpgradeCta ? 'circle-dollar-sign' : 'hand-coins'"
					size="xlarge"
					color="text-base"
				/>
				<N8nText size="large" bold color="text-dark" tag="h2">{{ title }}</N8nText>
				<N8nText size="small" color="text-light" tag="p" :class="$style.description">
					{{ description }}
				</N8nText>

				<div :class="$style.services" data-test-id="ai-gateway-topup-services">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('aiGateway.topUp.modal.servicesHint') }}
					</N8nText>
					<div :class="$style.providerIcons" role="list">
						<div
							v-for="service in COVERED_SERVICES"
							:key="service.credentialType"
							:class="$style.provider"
							role="listitem"
						>
							<CredentialIcon :credential-type-name="service.credentialType" :size="20" />
							<N8nText size="small" color="text-base">
								{{ i18n.baseText(service.labelKey) }}
							</N8nText>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					data-test-id="ai-gateway-topup-close"
					:label="i18n.baseText('generic.close')"
					@click="close"
				/>
				<N8nButton
					v-if="showUpgradeCta"
					variant="solid"
					icon="external-link"
					data-test-id="ai-gateway-topup-upgrade"
					:label="i18n.baseText('generic.upgrade')"
					@click="onUpgrade(close)"
				/>
				<N8nButton
					v-else-if="showAdminPanelCta"
					variant="solid"
					icon="external-link"
					data-test-id="ai-gateway-topup-admin-panel"
					:label="i18n.baseText('aiGateway.topUp.modal.cta.openAdminPanel')"
					@click="onOpenAdminPanel(close)"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0 var(--spacing--md);
	min-height: 240px;
	justify-content: center;
}

.description {
	margin: 0;
}

.services {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding-top: var(--spacing--sm);
	border-top: var(--border-width) solid var(--color--foreground);
}

.providerIcons {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--sm);
}

.provider {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>

<style lang="scss">
.ai-gateway-topup-dialog.el-dialog {
	background-color: var(--color--background);
}
</style>
