<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import SurfaceMcpBridgeGraphic from '@/experiments/surfaceMcpToNewCloudUsers/components/SurfaceMcpBridgeGraphic.vue';
import { useSurfaceMcpToNewCloudUsersStore } from '@/experiments/surfaceMcpToNewCloudUsers/stores/surfaceMcpToNewCloudUsers.store';
import MCPAccessToggle from '@/features/ai/mcpAccess/components/header/McpAccessToggle.vue';
import MCPOnboardingClientSetup from '@/features/ai/mcpAccess/components/onboarding/MCPOnboardingClientSetup.vue';
import { MCP_ENDPOINT, MCP_ONBOARDING_MODAL_KEY } from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { N8nIcon, N8nNotice, N8nRadioButtons, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

type MCPOnboardingClient = 'claude_code' | 'cursor' | 'codex';
type MCPOnboardingSurface = 'tile' | 'first_open_modal';

const props = defineProps<{
	data?: {
		surface?: MCPOnboardingSurface;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const mcpStore = useMCPStore();
const experimentStore = useSurfaceMcpToNewCloudUsersStore();
const modalBus = createEventBus();

const activeClient = ref<MCPOnboardingClient>('claude_code');
const isToggling = ref(false);
const enabledDuringThisOpen = ref(false);
const accessToken = ref('');
const isKeyRedacted = ref(false);
const hasResolvedAccessToken = ref(false);

const surface = computed<MCPOnboardingSurface>(() => props.data?.surface ?? 'tile');

const clientOptions = computed(() => [
	{
		value: 'claude_code',
		label: i18n.baseText('settings.mcp.onboarding.client.claudeCode'),
	},
	{
		value: 'cursor',
		label: i18n.baseText('settings.mcp.onboarding.client.cursor' as BaseTextKey),
	},
	{
		value: 'codex',
		label: i18n.baseText('settings.mcp.onboarding.client.codex'),
	},
]);

const serverUrl = computed(() => `${rootStore.urlBaseEditor}${MCP_ENDPOINT}`);

function resetAccessTokenState() {
	accessToken.value = '';
	isKeyRedacted.value = false;
	hasResolvedAccessToken.value = false;
}

function setAccessTokenState(apiKey: string | null | undefined) {
	accessToken.value = apiKey ?? '';
	isKeyRedacted.value = accessToken.value.includes('******');
	hasResolvedAccessToken.value = Boolean(accessToken.value) && !isKeyRedacted.value;
}

function restoreAccessTokenState(state: {
	accessToken: string;
	isKeyRedacted: boolean;
	hasResolvedAccessToken: boolean;
}) {
	accessToken.value = state.accessToken;
	isKeyRedacted.value = state.isKeyRedacted;
	hasResolvedAccessToken.value = state.hasResolvedAccessToken;
}

async function resolveAccessToken() {
	const apiKey = await mcpStore.getOrCreateApiKey();

	// If the server only retains a hashed token, rotate to get a usable one —
	// the whole point of this modal is to copy the token into the setup prompt,
	// so a redacted token here is useless to the user.
	if (apiKey.apiKey.includes('******')) {
		try {
			const rotated = await mcpStore.generateNewApiKey();
			setAccessTokenState(rotated.apiKey);
			return;
		} catch (error) {
			// Rotation failed — fall back to surfacing the redacted state so the
			// user can recover via Settings > MCP.
			toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
		}
	}

	setAccessTokenState(apiKey.apiKey);
}

async function resolveAccessTokenSafely() {
	try {
		await resolveAccessToken();
	} catch (error) {
		resetAccessTokenState();
		toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
	}
}

async function handleToggleMcpAccess() {
	const nextValue = !mcpStore.mcpAccessEnabled;

	try {
		isToggling.value = true;

		if (nextValue) {
			experimentStore.trackEnableClicked(surface.value);
			const updated = await mcpStore.setMcpAccessEnabled(true);

			if (!updated) {
				return;
			}

			enabledDuringThisOpen.value = true;
			experimentStore.trackEnabled(surface.value);
			await resolveAccessTokenSafely();
			return;
		}

		const previousAccessTokenState = {
			accessToken: accessToken.value,
			isKeyRedacted: isKeyRedacted.value,
			hasResolvedAccessToken: hasResolvedAccessToken.value,
		};

		try {
			await mcpStore.setMcpAccessEnabled(false);
			resetAccessTokenState();
		} catch (error) {
			restoreAccessTokenState(previousAccessTokenState);
			toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
		}
	} catch (error) {
		resetAccessTokenState();
		toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
	} finally {
		isToggling.value = false;
	}
}

function handleModalClosed() {
	if (
		surface.value === 'first_open_modal' &&
		!enabledDuringThisOpen.value &&
		!mcpStore.mcpAccessEnabled
	) {
		experimentStore.dismissFirstOpenModal();
		experimentStore.trackDismissed(surface.value);
	}

	mcpStore.resetCurrentUserMCPKey();
	resetAccessTokenState();
}

function handleClientChange(value: string) {
	activeClient.value = value as MCPOnboardingClient;
	experimentStore.trackClientSelected(activeClient.value);
}

function handleClientSetupCopy(parameter: 'agent-prompt') {
	experimentStore.trackCopiedParameter(surface.value, activeClient.value, parameter);
}

onMounted(() => {
	modalBus.on('closed', handleModalClosed);

	if (mcpStore.mcpAccessEnabled) {
		void resolveAccessTokenSafely();
	}
});

onBeforeUnmount(() => {
	modalBus.off('closed', handleModalClosed);
	mcpStore.resetCurrentUserMCPKey();
	resetAccessTokenState();
});
</script>

<template>
	<Modal
		:name="MCP_ONBOARDING_MODAL_KEY"
		:title="i18n.baseText('settings.mcp.onboarding.title')"
		width="640px"
		:event-bus="modalBus"
		:close-on-click-modal="true"
		:custom-class="$style.modal"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.headerGraphic">
					<SurfaceMcpBridgeGraphic size="hero" />
				</div>
				<h1 :class="$style.headerTitle">
					{{ i18n.baseText('settings.mcp.onboarding.title') }}
				</h1>
				<N8nText
					tag="p"
					size="small"
					color="text-base"
					align="center"
					:class="$style.headerDescription"
				>
					{{ i18n.baseText('settings.mcp.onboarding.description') }}
				</N8nText>
			</div>
		</template>

		<template #content>
			<div :class="$style.content" data-test-id="mcp-onboarding-modal-content">
				<!-- Step 1: Enable MCP access -->
				<section :class="$style.section">
					<header :class="$style.sectionHeader">
						<span
							:class="[$style.sectionStep, { [$style.sectionStepDone]: mcpStore.mcpAccessEnabled }]"
						>
							<N8nIcon
								v-if="mcpStore.mcpAccessEnabled"
								icon="check"
								size="xsmall"
								:stroke-width="2.5"
							/>
							<template v-else>1</template>
						</span>
						<h2 :class="$style.sectionTitle">
							{{ i18n.baseText('settings.mcp.onboarding.section.access.title') }}
						</h2>
					</header>
					<div :class="[$style.sectionBody, $style.accessRow]">
						<N8nText size="small" color="text-base" :class="$style.accessHelper">
							{{
								mcpStore.mcpAccessEnabled
									? i18n.baseText('settings.mcp.onboarding.section.access.enabled')
									: i18n.baseText('settings.mcp.onboarding.section.access.helper')
							}}
						</N8nText>
						<MCPAccessToggle
							:model-value="mcpStore.mcpAccessEnabled"
							:disabled="mcpStore.mcpManagedByEnv"
							:loading="isToggling"
							:managed-by-env="mcpStore.mcpManagedByEnv"
							@disable-mcp-access="handleToggleMcpAccess"
						/>
					</div>
				</section>

				<!-- Steps 2 & 3 reveal once MCP is enabled -->
				<template v-if="mcpStore.mcpAccessEnabled">
					<!-- Step 2: Choose your agent -->
					<section :class="[$style.section, $style.revealSection]">
						<header :class="$style.sectionHeader">
							<span :class="$style.sectionStep">2</span>
							<h2 :class="$style.sectionTitle">
								{{ i18n.baseText('settings.mcp.onboarding.section.client.title') }}
							</h2>
						</header>
						<div :class="$style.sectionBody">
							<div :class="$style.radioWrap">
								<N8nRadioButtons
									data-test-id="mcp-onboarding-client-switcher"
									:model-value="activeClient"
									:options="clientOptions"
									@update:model-value="handleClientChange"
								/>
							</div>
						</div>
					</section>

					<!-- Step 3: Run the setup prompt -->
					<section :class="[$style.section, $style.revealSection]">
						<header :class="$style.sectionHeader">
							<span :class="$style.sectionStep">3</span>
							<h2 :class="$style.sectionTitle">
								{{ i18n.baseText('settings.mcp.onboarding.section.prompt.title') }}
							</h2>
						</header>
						<div :class="$style.sectionBody">
							<N8nNotice
								v-if="isKeyRedacted"
								theme="warning"
								data-test-id="mcp-onboarding-redacted-notice"
								:class="$style.inlineNotice"
							>
								{{ i18n.baseText('settings.mcp.onboarding.redacted.notice') }}
							</N8nNotice>
							<MCPOnboardingClientSetup
								:client="activeClient"
								:server-url="serverUrl"
								:access-token="accessToken"
								:is-token-ready="hasResolvedAccessToken"
								@copy="handleClientSetupCopy"
							/>
						</div>
					</section>
				</template>

				<!-- Inline pending hint when MCP is off -->
				<N8nText
					v-else
					size="small"
					color="text-light"
					align="center"
					data-test-id="mcp-onboarding-pending-notice"
					:class="$style.pendingHint"
				>
					{{ i18n.baseText('settings.mcp.onboarding.section.prompt.disabled') }}
				</N8nText>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion.scss' as motion;

.modal {
	overflow: hidden;

	:global(.el-dialog__header) {
		padding: 0;
		margin: 0;
	}

	:global(.el-dialog__body) {
		padding-top: var(--spacing--lg);
	}
}

// --- Header (centered hero) -----------------------------------------------

.header {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xl) var(--spacing--3xl) var(--spacing--lg);
	background: linear-gradient(180deg, rgb(234 152 75 / 8%) 0%, rgb(234 152 75 / 0%) 100%);
	border-bottom: 1px solid var(--border-color--subtle);
	text-align: center;
}

.headerGraphic {
	margin-bottom: var(--spacing--xs);

	@include motion.fade-in-up;
}

.headerTitle {
	margin: 0;
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--tight);
	color: var(--text-color);
}

.headerDescription {
	max-width: 50ch;
	line-height: 1.55;
	margin-top: var(--spacing--3xs);
}

// --- Sections -------------------------------------------------------------

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.revealSection {
	@include motion.fade-in-up;

	animation-duration: var(--duration--base);
	animation-fill-mode: both;

	&:nth-of-type(2) {
		animation-delay: 60ms;
	}

	&:nth-of-type(3) {
		animation-delay: 120ms;
	}
}

.pendingHint {
	display: block;
	padding: var(--spacing--xs) var(--spacing--md);
	border: 1px dashed var(--border-color--subtle);
	border-radius: var(--radius);
	background: var(--background--surface);
	line-height: 1.5;
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.sectionStep {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	border-radius: var(--radius--full);
	background: var(--background--surface);
	border: 1px solid var(--border-color--strong);
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
	flex-shrink: 0;
	transition:
		background-color var(--duration--snappy) ease,
		border-color var(--duration--snappy) ease,
		color var(--duration--snappy) ease;
}

.sectionStepDone {
	background: var(--color--green-500, #22c55e);
	border-color: var(--color--green-500, #22c55e);
	color: var(--color--neutral-white, #fff);
}

.sectionTitle {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--tight);
	color: var(--text-color);
}

.sectionBody {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding-left: calc(22px + var(--spacing--2xs));
}

// --- Section 1: agent picker ----------------------------------------------

.radioWrap {
	display: inline-flex;
}

// --- Section 2: access toggle row -----------------------------------------

.accessRow {
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	width: 100%;

	@media (max-width: 600px) {
		flex-direction: column;
		align-items: flex-start;
	}
}

.accessHelper {
	flex: 1;
	min-width: 0;
	line-height: 1.5;
}

// --- Section 3: prompt ----------------------------------------------------

.inlineNotice {
	margin: 0;
	width: 100%;
}
</style>
