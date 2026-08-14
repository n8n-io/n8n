<script lang="ts" setup>
import { computed, onMounted, ref, type Component } from 'vue';
import { ROLE } from '@n8n/api-types';
import { N8nAlertDialog, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';
import BraveSearchLogo from '../assets/service-icons/brave-search.svg?component';
import BrowserbaseLogo from '../assets/service-icons/browserbase.svg?component';
import FirecrawlLogo from '../assets/service-icons/firecrawl.svg?component';
import LlamaIndexLogo from '../assets/service-icons/llamaindex.svg?component';
import PdfcoLogo from '../assets/service-icons/pdfco.svg?component';

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

const i18n = useI18n();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const cloudPlanStore = useCloudPlanStore();
const { goToUpgrade } = usePageRedirectionHelper();

const isOpen = ref(true);

type TopUpVariant = 'member' | 'memberTrial' | 'ownerTrial';

const variant = computed<TopUpVariant>(() => {
	if (usersStore.isInstanceOwner) return 'ownerTrial';
	return cloudPlanStore.userIsTrialing ? 'memberTrial' : 'member';
});

const isOwnerTrial = computed(() => variant.value === 'ownerTrial');

onMounted(async () => {
	if (isOwnerTrial.value) return;

	await usersStore.fetchUsers({ filter: { isOwner: true } });
});

const title = computed(() =>
	isOwnerTrial.value
		? i18n.baseText('aiGateway.topUp.modal.title.trial')
		: i18n.baseText('aiGateway.topUp.modal.title.member'),
);

const description = computed(() => {
	const keys = {
		ownerTrial: 'aiGateway.topUp.modal.description.trial',
		memberTrial: 'aiGateway.topUp.modal.description.member.trial',
		member: 'aiGateway.topUp.modal.description.member',
	} as const satisfies Record<TopUpVariant, BaseTextKey>;
	return i18n.baseText(keys[variant.value]);
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
					v-for="service in FEATURED_SERVICES"
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
						<CredentialIcon v-else :credential-type-name="service.credentialType" :size="18" />
					</span>
					<N8nText size="small" color="text-dark" :class="$style.serviceName">
						{{ i18n.baseText(service.labelKey) }}
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
