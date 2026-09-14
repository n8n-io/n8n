<script lang="ts" setup>
import { computed, onMounted, ref, type Component } from 'vue';
import { ROLE } from '@n8n/api-types';
import { N8nAlertDialog, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import type { AiGatewayTopUpVariant } from '@/app/composables/useAiGatewayTopUp';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';
import AlibabaLogo from '../assets/service-icons/alibaba.svg?component';
import AnthropicLogo from '../assets/service-icons/anthropic.svg?component';
import BraveSearchLogo from '../assets/service-icons/brave-search.svg?component';
import BrowserbaseLogo from '../assets/service-icons/browserbase.svg?component';
import FirecrawlLogo from '../assets/service-icons/firecrawl.svg?component';
import GeminiLogo from '../assets/service-icons/gemini.svg?component';
import LlamaIndexLogo from '../assets/service-icons/llamaindex.svg?component';
import MiniMaxLogo from '../assets/service-icons/minimax.svg?component';
import MoonshotLogo from '../assets/service-icons/moonshot.svg?component';
import OpenAiLogo from '../assets/service-icons/openai.svg?component';
import PdfcoLogo from '../assets/service-icons/pdfco.svg?component';

const FEATURED_SERVICES = [
	{
		credentialType: 'openAiApi',
		labelKey: 'aiGateway.topUp.modal.service.openAi',
		logo: OpenAiLogo,
	},
	{
		credentialType: 'anthropicApi',
		labelKey: 'aiGateway.topUp.modal.service.anthropic',
		logo: AnthropicLogo,
	},
	{
		credentialType: 'googlePalmApi',
		labelKey: 'aiGateway.topUp.modal.service.googleGemini',
		logo: GeminiLogo,
	},
	{
		credentialType: 'minimaxApi',
		labelKey: 'aiGateway.topUp.modal.service.minimax',
		logo: MiniMaxLogo,
	},
	{
		credentialType: 'moonshotApi',
		labelKey: 'aiGateway.topUp.modal.service.moonshot',
		logo: MoonshotLogo,
	},
	{
		credentialType: 'alibabaCloudApi',
		labelKey: 'aiGateway.topUp.modal.service.qwenCloud',
		logo: AlibabaLogo,
	},
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
] satisfies ReadonlyArray<{
	credentialType: string;
	labelKey: BaseTextKey;
	logo: Component;
}>;

const props = defineProps<{
	variant: AiGatewayTopUpVariant;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const { goToUpgrade } = usePageRedirectionHelper();

const isOpen = ref(true);
const isOwnerTrial = computed(() => props.variant === 'ownerTrial');
const needsOwnerEmail = computed(
	() => props.variant === 'member' || props.variant === 'memberTrial',
);
const showsServices = computed(() => props.variant !== 'member');
const ownerEmails = computed(() =>
	usersStore.allUsers
		.filter((user) => user.role === ROLE.Owner)
		.map((user) => user.email)
		.filter((email): email is string => Boolean(email)),
);
const ownerLookupPending = ref(needsOwnerEmail.value && ownerEmails.value.length === 0);

onMounted(async () => {
	if (!needsOwnerEmail.value) return;

	try {
		await usersStore.fetchUsers({ filter: { isOwner: true } });
	} finally {
		ownerLookupPending.value = false;
	}
});

const title = computed(() => {
	const keys = {
		ownerTrial: 'aiGateway.topUp.modal.title.trial',
		memberTrial: 'aiGateway.topUp.modal.title.member',
		member: 'aiGateway.topUp.modal.title.member',
	} as const satisfies Record<AiGatewayTopUpVariant, BaseTextKey>;
	return i18n.baseText(keys[props.variant]);
});

const description = computed(() => {
	const keys = {
		ownerTrial: 'aiGateway.topUp.modal.description.trial',
		memberTrial: 'aiGateway.topUp.modal.description.member.trial',
		member: 'aiGateway.topUp.modal.description.member',
	} as const satisfies Record<AiGatewayTopUpVariant, BaseTextKey>;
	return i18n.baseText(keys[props.variant]);
});

const actionLabel = computed(() => {
	if (isOwnerTrial.value) return i18n.baseText('generic.upgrade');
	return i18n.baseText('aiGateway.topUp.modal.cta.contactAdmin');
});

function close(): void {
	isOpen.value = false;
	uiStore.closeModal(AI_GATEWAY_TOP_UP_MODAL_KEY);
}

function onOpenChange(open: boolean): void {
	if (!open) close();
}

function ownerMailtoHref(): string {
	const subject = encodeURIComponent(
		i18n.baseText('aiGateway.topUp.modal.cta.contactAdmin.subject'),
	);
	return ownerEmails.value.length > 0
		? `mailto:${ownerEmails.value.join(',')}?subject=${subject}`
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
		:loading="ownerLookupPending"
		:cancel-label="i18n.baseText('generic.cancel')"
		size="medium"
		data-test-id="ai-gateway-topup-modal"
		@update:open="onOpenChange"
		@action="onAction"
	>
		<div v-if="showsServices" :class="$style.services" data-test-id="ai-gateway-topup-services">
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
					<span :class="$style.logo" aria-hidden="true">
						<component
							:is="service.logo"
							:class="$style.logoSvg"
							:data-test-id="`service-logo-${service.credentialType}`"
						/>
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
	color: var(--color--text);
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
