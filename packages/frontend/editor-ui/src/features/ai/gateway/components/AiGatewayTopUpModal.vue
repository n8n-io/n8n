<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { N8nButton, N8nIcon, N8nInputNumber, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { BUILTIN_CREDENTIALS_DOCS_URL } from '@/app/constants/urls';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import Modal from '@/app/components/Modal.vue';

const PRESET_AMOUNTS = [10, 20, 50, 100] as const;

// TODO: Set to false and use onBuy() when credit purchasing is implemented
const SKIP_BUY = true;
const DEFAULT_AMOUNT = 100;

const i18n = useI18n();
const uiStore = useUIStore();
const aiGatewayStore = useAiGatewayStore();
const credentialsStore = useCredentialsStore();

const modalData = computed(() => uiStore.modalsById[AI_GATEWAY_TOP_UP_MODAL_KEY]?.data);
const credentialType = computed<string | undefined>(
	() => modalData.value?.credentialType as string | undefined,
);

const credentialDocsUrl = computed(() => {
	if (!credentialType.value) return '';

	const type = credentialsStore.getCredentialTypeByName(credentialType.value);
	if (!type || !type.documentationUrl) return '';

	if (type.documentationUrl.startsWith('http')) {
		return type.documentationUrl;
	}

	return `${BUILTIN_CREDENTIALS_DOCS_URL}${type.documentationUrl}/`;
});

const selectedPreset = ref<number | null>(null);
const customAmount = ref<number | null>(null);
const isLoading = ref(false);
const showThankYou = ref(false);

const effectiveAmount = computed(() => {
	if (customAmount.value !== null && customAmount.value > 0) return customAmount.value;
	return selectedPreset.value;
});

const isBuyDisabled = computed(
	() => effectiveAmount.value === null || effectiveAmount.value <= 0 || isLoading.value,
);

function selectPreset(amount: number) {
	selectedPreset.value = selectedPreset.value === amount ? null : amount;
	customAmount.value = null;
}

function onCustomInput(value: number | null) {
	customAmount.value = value;
	if (value !== null && value > 0) {
		selectedPreset.value = null;
	}
}

function close() {
	showThankYou.value = false;
	selectedPreset.value = null;
	customAmount.value = null;
	uiStore.closeModal(AI_GATEWAY_TOP_UP_MODAL_KEY);
}

// When SKIP_BUY is true, send request on open and jump straight to the thank-you screen.
// Remove this block when credit purchasing is implemented.
onMounted(async () => {
	if (!SKIP_BUY) return;
	await aiGatewayStore.topUpCredits(DEFAULT_AMOUNT);
	showThankYou.value = true;
});

async function onBuy() {
	if (effectiveAmount.value === null || effectiveAmount.value <= 0) return;
	isLoading.value = true;
	await aiGatewayStore.topUpCredits(effectiveAmount.value);
	isLoading.value = false;
	if (!aiGatewayStore.fetchError) {
		showThankYou.value = true;
	}
}
</script>

<template>
	<Modal
		:name="AI_GATEWAY_TOP_UP_MODAL_KEY"
		:title="showThankYou ? '' : i18n.baseText('settings.n8nConnect.topUp.modalTitle')"
		width="520px"
		custom-class="ai-gateway-topup-dialog"
		data-test-id="ai-gateway-topup-modal"
	>
		<template #content>
			<div :class="$style.contentWrapper">
				<div v-if="!showThankYou" :class="$style.body">
					<N8nText color="text-base">
						{{ i18n.baseText('settings.n8nConnect.topUp.description') }}
					</N8nText>

					<div :class="$style.presets">
						<button
							v-for="amount in PRESET_AMOUNTS"
							:key="amount"
							:class="[$style.presetBtn, { [$style.presetBtnSelected]: selectedPreset === amount }]"
							data-test-id="ai-gateway-topup-preset"
							@click="selectPreset(amount)"
						>
							<span :class="$style.currencySymbol">$</span>{{ amount }}
						</button>
					</div>

					<N8nInputNumber
						:class="$style.customInput"
						:model-value="customAmount"
						:min="1"
						:precision="0"
						:placeholder="i18n.baseText('settings.n8nConnect.topUp.customPlaceholder')"
						data-test-id="ai-gateway-topup-custom"
						@update:model-value="onCustomInput"
					/>
				</div>

				<!-- Thank you state (temporary: buying credits is in development) -->
				<div v-else :class="$style.thankYouBody">
					<N8nIcon icon="hourglass" size="xlarge" color="text-base" :class="$style.thankYouIcon" />
					<N8nText :class="$style.thankYouTitle" bold color="text-dark"
						>Credit top up is comming soon</N8nText
					>

					<div :class="$style.thankYouContent">
						<p :class="$style.thankYouParagraph">
							Unfortunately credit top up is still in development.
						</p>
						<p :class="$style.thankYouParagraph">
							You'll be notified in the comming weeks when this feature became available.
						</p>
						<p :class="$style.thankYouParagraph">
							In the meantime, you can switch off n8n Connect in any workflows using it and setup
							your own credential.
						</p>
						<N8nLink
							v-if="credentialType"
							:to="credentialDocsUrl"
							new-window
							data-test-id="ai-gateway-topup-credentials-docs-link"
						>
							Open setup guide
						</N8nLink>
					</div>
				</div>
			</div>
		</template>

		<template v-if="!showThankYou" #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					size="large"
					:label="i18n.baseText('generic.cancel')"
					@click="close"
				/>
				<N8nButton
					size="large"
					:label="i18n.baseText('settings.n8nConnect.topUp.buy')"
					:loading="isLoading"
					:disabled="isBuyDisabled"
					data-test-id="ai-gateway-topup-buy"
					@click="onBuy"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.contentWrapper {
	min-height: 300px;
	display: flex;
	flex-direction: column;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--xs) 0 var(--spacing--md);
}

.presets {
	display: flex;
	gap: var(--spacing--xs);
}

.presetBtn {
	flex: 1;
	padding: var(--spacing--sm) 0;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background: transparent;
	color: var(--color--text);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	transition:
		border-color 0.15s,
		background-color 0.15s;

	&:hover {
		border-color: var(--color--foreground--shade-2);
		background-color: var(--color--foreground--tint-1);
	}
}

.presetBtnSelected {
	border-color: var(--color--success);
	background-color: var(--color--success);
	color: var(--color--neutral-white);

	.currencySymbol {
		color: inherit;
		opacity: 0.7;
	}
}

.currencySymbol {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
	margin-right: var(--spacing--3xs);
}

.customInput {
	width: 100%;
}

.thankYouBody {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
}

.thankYouIcon {
	flex-shrink: 0;
}

.thankYouTitle {
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
	margin: 0;
}

.thankYouContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.thankYouParagraph {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	text-align: center;
}

.footer {
	display: flex;
	justify-content: space-between;
	width: 100%;
}
</style>

<style lang="scss">
.ai-gateway-topup-dialog.el-dialog {
	background-color: var(--color--background);
}
</style>
