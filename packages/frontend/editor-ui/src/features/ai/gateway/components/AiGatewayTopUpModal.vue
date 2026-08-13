<script lang="ts" setup>
import { computed, onMounted, ref, type Component } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { ROLE } from '@n8n/api-types';
import { N8nAlertDialog, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import BraveSearchLogo from '../assets/service-icons/brave-search.svg?component';
import BrowserbaseLogo from '../assets/service-icons/browserbase.svg?component';
import FirecrawlLogo from '../assets/service-icons/firecrawl.svg?component';
import LlamaIndexLogo from '../assets/service-icons/llamaindex.svg?component';
import PdfcoLogo from '../assets/service-icons/pdfco.svg?component';

const i18n = useI18n();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const cloudPlanStore = useCloudPlanStore();
const aiGatewayStore = useAiGatewayStore();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const { goToUpgrade } = usePageRedirectionHelper();

const isOpen = ref(true);

type TopUpVariant = 'member' | 'memberTrial' | 'ownerTrial';

const variant = computed<TopUpVariant>(() => {
	if (usersStore.isInstanceOwner) return 'ownerTrial';
	return cloudPlanStore.userIsTrialing ? 'memberTrial' : 'member';
});

const isOwnerTrial = computed(() => variant.value === 'ownerTrial');

// Featured first (always named). Bundled logos: community packages have no credential icon until installed.
const FEATURED_SERVICES = [
	{ credentialType: 'openAiApi', labelKey: 'aiGateway.topUp.modal.service.openAi' },
	{ credentialType: 'anthropicApi', labelKey: 'aiGateway.topUp.modal.service.anthropic' },
	{ credentialType: 'googlePalmApi', labelKey: 'aiGateway.topUp.modal.service.googleGemini' },
	{
		credentialType: 'firecrawlApi',
		labelKey: 'aiGateway.topUp.modal.service.firecrawl',
		logo: FirecrawlLogo,
	},
	{
		credentialType: 'browserbaseApi',
		labelKey: 'aiGateway.topUp.modal.service.browserbase',
		logo: BrowserbaseLogo,
	},
	{
		credentialType: 'braveSearchApi',
		labelKey: 'aiGateway.topUp.modal.service.brave',
		logo: BraveSearchLogo,
	},
	{ credentialType: 'pdfcoApi', labelKey: 'aiGateway.topUp.modal.service.pdfco', logo: PdfcoLogo },
	{
		credentialType: 'llamaParseApi',
		labelKey: 'aiGateway.topUp.modal.service.llamaIndex',
		logo: LlamaIndexLogo,
	},
] as const satisfies ReadonlyArray<{
	credentialType: string;
	labelKey: BaseTextKey;
	logo?: Component;
}>;

const BUNDLED_LOGOS = new Map<string, Component>(
	FEATURED_SERVICES.flatMap((service) =>
		'logo' in service ? [[service.credentialType, service.logo]] : [],
	),
);

const FEATURED_LABEL_KEYS = new Map<string, BaseTextKey>(
	FEATURED_SERVICES.map((service) => [service.credentialType, service.labelKey]),
);

// First node that uses the credential wins — some vendors put the logo on the node, not the credential.
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

// Credential picker names include "API" / "Account"; drop that for the tile.
function toBrandName(displayName: string): string {
	return displayName.replace(/\s+(api|account|credentials?)$/i, '').trim();
}

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

		if (!label || seen.has(label)) return [];
		seen.add(label);

		return [
			{
				credentialType,
				label,
				logo: BUNDLED_LOGOS.get(credentialType),
				hasCredentialIcon: Boolean(credential?.icon ?? credential?.iconUrl),
				nodeType,
			},
		];
	});
});

onMounted(async () => {
	if (isOwnerTrial.value) {
		await Promise.allSettled([
			aiGatewayStore.fetchConfig(),
			credentialsStore.fetchCredentialTypes(false),
			nodeTypesStore.loadNodeTypesIfNotLoaded(),
		]);
		return;
	}

	await usersStore.fetchUsers({ filter: { isOwner: true } });
});

const title = computed(() =>
	isOwnerTrial.value
		? i18n.baseText('aiGateway.topUp.modal.title.trial')
		: i18n.baseText('aiGateway.topUp.modal.title.member'),
);

const description = computed(() => {
	switch (variant.value) {
		case 'ownerTrial':
			return i18n.baseText('aiGateway.topUp.modal.description.trial');
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

const actionLabel = computed(() =>
	isOwnerTrial.value
		? i18n.baseText('generic.upgrade')
		: i18n.baseText('aiGateway.topUp.modal.cta.contactAdmin'),
);

function close(): void {
	isOpen.value = false;
	uiStore.closeModal(AI_GATEWAY_TOP_UP_MODAL_KEY);
}

function onOpenChange(open: boolean): void {
	if (!open) close();
}

function ownerMailtoHref(): string {
	const emails = usersStore.allUsers
		.filter((user) => user.role === ROLE.Owner)
		.map((user) => user.email)
		.filter((email): email is string => Boolean(email));
	const subject = encodeURIComponent(
		i18n.baseText('aiGateway.topUp.modal.cta.contactAdmin.subject'),
	);
	return emails.length > 0
		? `mailto:${emails.join(',')}?subject=${subject}`
		: `mailto:?subject=${subject}`;
}

async function onAction(): Promise<void> {
	if (isOwnerTrial.value) {
		close();
		await goToUpgrade('ai-gateway-top-up', 'upgrade-ai-gateway-top-up');
		return;
	}

	window.open(ownerMailtoHref());
	close();
}
</script>

<template>
	<N8nAlertDialog
		:open="isOpen"
		:title="title"
		:description="description"
		:action-label="actionLabel"
		:cancel-label="i18n.baseText('generic.cancel')"
		size="medium"
		data-test-id="ai-gateway-topup-modal"
		@update:open="onOpenChange"
		@action="onAction"
	>
		<div v-if="isOwnerTrial" :class="$style.services" data-test-id="ai-gateway-topup-services">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('aiGateway.topUp.modal.servicesHint') }}
			</N8nText>
			<div :class="$style.serviceGrid" role="list">
				<div
					v-for="service in services"
					:key="service.credentialType"
					:class="$style.serviceTag"
					role="listitem"
				>
					<span :class="$style.logo">
						<component
							:is="service.logo"
							v-if="service.logo"
							:class="$style.logoSvg"
							:data-test-id="`service-logo-${service.credentialType}`"
						/>
						<CredentialIcon
							v-else-if="service.hasCredentialIcon"
							:credential-type-name="service.credentialType"
							:size="18"
						/>
						<NodeIcon v-else-if="service.nodeType" :node-type="service.nodeType" :size="18" />
					</span>
					<N8nText size="small" color="text-dark" :class="$style.serviceName">
						{{ service.label }}
					</N8nText>
				</div>
			</div>
		</div>
	</N8nAlertDialog>
</template>

<style lang="scss" module>
.services {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--md);
}

.serviceGrid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--2xs);
}

.serviceTag {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) solid var(--border-color);
	border-radius: var(--radius--xs);
}

.logo {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	width: 18px;
	height: 18px;
}

.logoSvg {
	width: 100%;
	height: 100%;
}

.serviceName {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
</style>
