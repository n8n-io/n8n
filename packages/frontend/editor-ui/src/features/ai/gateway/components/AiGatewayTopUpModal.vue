<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { N8nButton, N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, CLOUD_N8N_CONNECT_TOP_UP_PATH } from '@/app/constants';
import Modal from '@/app/components/Modal.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

const i18n = useI18n();
const usersStore = useUsersStore();
const cloudPlanStore = useCloudPlanStore();
const settingsStore = useSettingsStore();
const aiGatewayStore = useAiGatewayStore();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const { goToUpgrade } = usePageRedirectionHelper();
const toast = useToast();

type TopUpVariant = 'member' | 'memberTrial' | 'owner' | 'ownerTrial';

/**
 * Named up front, and named even when the instance can't resolve them: the model providers
 * people look for, then the tool services they don't expect credits to cover. Everything else
 * the gateway covers follows in config order.
 */
const FEATURED_SERVICES = [
	{ credentialType: 'openAiApi', labelKey: 'aiGateway.topUp.modal.service.openAi' },
	{ credentialType: 'anthropicApi', labelKey: 'aiGateway.topUp.modal.service.anthropic' },
	{ credentialType: 'googlePalmApi', labelKey: 'aiGateway.topUp.modal.service.googleGemini' },
	{ credentialType: 'firecrawlApi', labelKey: 'aiGateway.topUp.modal.service.firecrawl' },
	{ credentialType: 'browserbaseApi', labelKey: 'aiGateway.topUp.modal.service.browserbase' },
	{ credentialType: 'braveSearchApi', labelKey: 'aiGateway.topUp.modal.service.brave' },
	{ credentialType: 'pdfcoApi', labelKey: 'aiGateway.topUp.modal.service.pdfco' },
	{ credentialType: 'llamaParseApi', labelKey: 'aiGateway.topUp.modal.service.llamaIndex' },
] as const satisfies ReadonlyArray<{ credentialType: string; labelKey: BaseTextKey }>;

const FEATURED_LABEL_KEYS = new Map<string, BaseTextKey>(
	FEATURED_SERVICES.map((service) => [service.credentialType, service.labelKey]),
);

/**
 * Many credentials ship no icon of their own — the logo lives on the node instead (PDF.co ships
 * `pdfco.svg` on its node and nothing on `PdfcoApi`), so fall back to a node that uses the
 * credential. First match wins, which is fine for the vendor credentials the gateway covers.
 */
const nodeTypeByCredentialType = computed(() => {
	const byCredentialType = new Map<string, INodeTypeDescription>();
	for (const nodeType of nodeTypesStore.allLatestNodeTypes) {
		for (const credential of nodeType.credentials ?? []) {
			if (!byCredentialType.has(credential.name)) {
				byCredentialType.set(credential.name, nodeType);
			}
		}
	}
	return byCredentialType;
});

// Display names are written for the credential picker ("Firecrawl API"), so drop the trailing
// noun to leave the brand.
function toBrandName(displayName: string): string {
	return displayName.replace(/\s+(api|account|credentials?)$/i, '').trim();
}

/**
 * Every service the gateway covers, featured ones first. A service the instance knows nothing
 * about — no credential type, no node — is still named if it's featured, just without a logo;
 * any other unresolvable type is dropped rather than shown as a raw credential id.
 */
const services = computed(() => {
	const covered = aiGatewayStore.config?.credentialTypes ?? [];
	const credentialTypes = [
		...FEATURED_LABEL_KEYS.keys(),
		...covered.filter((credentialType) => !FEATURED_LABEL_KEYS.has(credentialType)),
	];
	const seen = new Set<string>();

	return credentialTypes.flatMap((credentialType) => {
		const credential = credentialsStore.getCredentialTypeByName(credentialType);
		const nodeType = nodeTypeByCredentialType.value.get(credentialType);
		const labelKey = FEATURED_LABEL_KEYS.get(credentialType);
		const label = labelKey
			? i18n.baseText(labelKey)
			: toBrandName(credential?.displayName ?? nodeType?.displayName ?? '');

		// Vendors reachable through more than one credential type get one tile, not several.
		if (!label || seen.has(label)) return [];
		seen.add(label);

		return [
			{
				credentialType,
				label,
				hasCredentialIcon: Boolean(credential?.icon ?? credential?.iconUrl),
				nodeType,
			},
		];
	});
});

onMounted(async () => {
	await Promise.allSettled([
		aiGatewayStore.fetchConfig(),
		credentialsStore.fetchCredentialTypes(false),
		nodeTypesStore.loadNodeTypesIfNotLoaded(),
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
	try {
		const link = await cloudPlanStore.generateCloudDashboardAutoLoginLink({
			redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
		});
		close();
		window.open(link, '_blank', 'noopener');
	} catch (error) {
		// Keep the modal open so the auto-login link can be retried.
		toast.showError(error, i18n.baseText('aiGateway.topUp.modal.cta.openAdminPanelError'));
	}
}
</script>

<template>
	<Modal
		:name="AI_GATEWAY_TOP_UP_MODAL_KEY"
		width="520px"
		max-height="80vh"
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

				<div :class="$style.services" data-test-id="ai-gateway-topup-services">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('aiGateway.topUp.modal.servicesHint') }}
					</N8nText>
					<div :class="$style.serviceGrid" role="list">
						<N8nCard
							v-for="service in services"
							:key="service.credentialType"
							:class="$style.serviceCard"
							role="listitem"
						>
							<div :class="$style.service">
								<span :class="$style.logo">
									<CredentialIcon
										v-if="service.hasCredentialIcon"
										:credential-type-name="service.credentialType"
										:size="18"
									/>
									<NodeIcon v-else-if="service.nodeType" :node-type="service.nodeType" :size="18" />
								</span>
								<N8nText size="small" color="text-dark" :class="$style.serviceName">
									{{ service.label }}
								</N8nText>
							</div>
						</N8nCard>
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
	grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
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

/* Reserved so names line up whether or not the service has a logo to show. */
.logo {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	width: 18px;
	height: 18px;
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
