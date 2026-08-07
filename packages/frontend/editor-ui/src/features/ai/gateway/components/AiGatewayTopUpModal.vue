<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { N8nButton, N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, CLOUD_N8N_CONNECT_TOP_UP_PATH } from '@/app/constants';
import Modal from '@/app/components/Modal.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

const i18n = useI18n();
const usersStore = useUsersStore();
const cloudPlanStore = useCloudPlanStore();
const settingsStore = useSettingsStore();
const aiGatewayStore = useAiGatewayStore();
const credentialsStore = useCredentialsStore();
const { goToUpgrade } = usePageRedirectionHelper();

type TopUpVariant = 'member' | 'memberTrial' | 'owner' | 'ownerTrial';

const SERVICE_PREVIEW_LIMIT = 6;

// Shown until the gateway config lands, and as a floor if it comes back empty.
const FEATURED_CREDENTIAL_TYPES = ['openAiApi', 'anthropicApi', 'googlePalmApi'];

// Credential display names are written for the credential picker ("Google Gemini(PaLM) Api");
// drop the trailing noun so the tiles read as partner brands.
function toBrandName(displayName: string): string {
	return displayName.replace(/\s+(api|account|credentials?)$/i, '');
}

function featuredRank(credentialType: string): number {
	const index = FEATURED_CREDENTIAL_TYPES.indexOf(credentialType);
	return index === -1 ? FEATURED_CREDENTIAL_TYPES.length : index;
}

/**
 * Covered services come from the gateway config rather than a hardcoded list, so the modal
 * can only advertise what the gateway actually serves. Types this instance doesn't know are
 * dropped — without a registered credential type there is no logo, and a placeholder glyph
 * next to a partner name reads as broken.
 */
const coveredServices = computed(() => {
	const credentialTypes = aiGatewayStore.config?.credentialTypes?.length
		? aiGatewayStore.config.credentialTypes
		: FEATURED_CREDENTIAL_TYPES;

	return credentialTypes
		.map((credentialType) => ({
			credentialType,
			displayName: credentialsStore.getCredentialTypeByName(credentialType)?.displayName,
		}))
		.filter(
			(service): service is { credentialType: string; displayName: string } =>
				service.displayName !== undefined,
		)
		.map((service) => ({ ...service, displayName: toBrandName(service.displayName) }))
		.sort((a, b) => featuredRank(a.credentialType) - featuredRank(b.credentialType));
});

const visibleServices = computed(() => coveredServices.value.slice(0, SERVICE_PREVIEW_LIMIT));

const hiddenServiceCount = computed(() =>
	Math.max(coveredServices.value.length - SERVICE_PREVIEW_LIMIT, 0),
);

onMounted(async () => {
	await Promise.allSettled([
		aiGatewayStore.fetchConfig(),
		credentialsStore.fetchCredentialTypes(false),
	]);
});

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
					:size="40"
					:stroke-width="1.5"
					color="foreground-xdark"
				/>
				<div :class="$style.intro">
					<N8nHeading tag="h2" size="large" bold align="center">{{ title }}</N8nHeading>
					<N8nText size="small" color="text-base" tag="p">{{ description }}</N8nText>
				</div>

				<div
					v-if="visibleServices.length"
					:class="$style.services"
					data-test-id="ai-gateway-topup-services"
				>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('aiGateway.topUp.modal.servicesHint') }}
					</N8nText>
					<div :class="$style.serviceGrid" role="list">
						<N8nCard
							v-for="service in visibleServices"
							:key="service.credentialType"
							:class="$style.serviceCard"
							role="listitem"
						>
							<div :class="$style.service">
								<CredentialIcon :credential-type-name="service.credentialType" :size="18" />
								<N8nText size="small" color="text-dark" :class="$style.serviceName">
									{{ service.displayName }}
								</N8nText>
							</div>
						</N8nCard>
					</div>
					<N8nText v-if="hiddenServiceCount" size="small" color="text-light">
						{{
							i18n.baseText('aiGateway.topUp.modal.servicesMore', {
								interpolate: { count: hiddenServiceCount },
							})
						}}
					</N8nText>
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
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0 var(--spacing--md);
	min-height: 240px;
	justify-content: center;
}

.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);

	p {
		margin: 0;
	}
}

.services {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding-top: var(--spacing--md);
	border-top: var(--border-width) solid var(--color--foreground);
}

.serviceGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	gap: var(--spacing--2xs);
	width: 100%;
}

.serviceCard {
	--card--padding: var(--spacing--2xs) var(--spacing--xs);
}

.service {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	text-align: left;
}

.serviceName {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
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
