<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import SurfaceMcpBridgeGraphic from '@/experiments/surfaceMcpToNewCloudUsers/components/SurfaceMcpBridgeGraphic.vue';
import { useSurfaceMcpToNewCloudUsersStore } from '@/experiments/surfaceMcpToNewCloudUsers/stores/surfaceMcpToNewCloudUsers.store';
import MCPAccessToggle from '@/features/ai/mcpAccess/components/header/McpAccessToggle.vue';
import MCPOnboardingAgentPicker from '@/features/ai/mcpAccess/components/onboarding/MCPOnboardingAgentPicker.vue';
import MCPOnboardingClientSetup from '@/features/ai/mcpAccess/components/onboarding/MCPOnboardingClientSetup.vue';
import MCPOnboardingCopyBlock from '@/features/ai/mcpAccess/components/onboarding/MCPOnboardingCopyBlock.vue';
import type {
	MCPOnboardingClient,
	MCPOnboardingClientOption,
} from '@/features/ai/mcpAccess/components/onboarding/types';
import {
	MCP_ENDPOINT,
	MCP_ONBOARDING_MODAL_KEY,
	MCP_SETTINGS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { I18nT } from 'vue-i18n';

type MCPOnboardingSurface = 'tile' | 'first_open_modal';

const MCP_ONBOARDING_DOCS_URL = 'https://docs.n8n.io/advanced-ai/mcp/accessing-n8n-mcp-server/';

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

const activeClient = ref<MCPOnboardingClient>('claude');
const isToggling = ref(false);
const enabledDuringThisOpen = ref(false);

const surface = computed<MCPOnboardingSurface>(() => props.data?.surface ?? 'tile');

const clientOptions = computed<MCPOnboardingClientOption[]>(() => [
	{
		value: 'claude',
		slug: 'claude',
		label: i18n.baseText('settings.mcp.onboarding.client.claude' as BaseTextKey),
	},
	{
		value: 'claude_code',
		slug: 'claude-code',
		label: i18n.baseText('settings.mcp.onboarding.client.claudeCode'),
	},
	{
		value: 'codex',
		slug: 'codex',
		label: i18n.baseText('settings.mcp.onboarding.client.codex'),
	},
	{
		value: 'cursor',
		slug: 'cursor',
		label: i18n.baseText('settings.mcp.onboarding.client.cursor' as BaseTextKey),
	},
	{
		value: 'chatgpt',
		slug: 'chatgpt',
		label: i18n.baseText('settings.mcp.onboarding.client.chatgpt' as BaseTextKey),
	},
]);

const serverUrl = computed(() => `${rootStore.urlBaseEditor}${MCP_ENDPOINT}`);
const showServerUrlStep = computed(() => activeClient.value === 'claude');
const activeClientLabel = computed(
	() =>
		clientOptions.value.find((option) => option.value === activeClient.value)?.label ??
		activeClient.value,
);
const promptSectionTitle = computed(() =>
	i18n.baseText('settings.mcp.onboarding.section.prompt.title', {
		interpolate: { assistant: activeClientLabel.value },
	}),
);

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
			return;
		}

		await mcpStore.setMcpAccessEnabled(false);
	} catch (error) {
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
}

function handleClientChange(value: MCPOnboardingClient) {
	activeClient.value = value;
	experimentStore.trackClientSelected(activeClient.value);
}

function handleClientSetupCopy(parameter: 'agent-prompt') {
	experimentStore.trackCopiedParameter(surface.value, activeClient.value, parameter);
}

onMounted(() => {
	modalBus.on('closed', handleModalClosed);
});

onBeforeUnmount(() => {
	modalBus.off('closed', handleModalClosed);
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
					<header :class="[$style.sectionHeader, $style.accessHeader]">
						<div :class="$style.accessTitleRow">
							<span
								:class="[
									$style.sectionStep,
									{ [$style.sectionStepDone]: mcpStore.mcpAccessEnabled },
								]"
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
						</div>
						<MCPAccessToggle
							:model-value="mcpStore.mcpAccessEnabled"
							:disabled="mcpStore.mcpManagedByEnv"
							:loading="isToggling"
							:managed-by-env="mcpStore.mcpManagedByEnv"
							@disable-mcp-access="handleToggleMcpAccess"
						/>
					</header>
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
							<MCPOnboardingAgentPicker
								:model-value="activeClient"
								:options="clientOptions"
								@update:model-value="handleClientChange"
							/>
						</div>
					</section>

					<!-- Step 3: Paste the prompt -->
					<section :class="[$style.section, $style.revealSection]">
						<header :class="$style.sectionHeader">
							<span :class="$style.sectionStep">3</span>
							<h2 :class="$style.sectionTitle">
								{{ promptSectionTitle }}
							</h2>
						</header>
						<div :class="$style.sectionBody">
							<MCPOnboardingClientSetup
								:client="activeClient"
								:server-url="serverUrl"
								@copy="handleClientSetupCopy"
							/>
						</div>
					</section>

					<section v-if="showServerUrlStep" :class="[$style.section, $style.revealSection]">
						<header :class="$style.sectionHeader">
							<span :class="$style.sectionStep">4</span>
							<h2 :class="$style.sectionTitle">
								{{
									i18n.baseText('settings.mcp.onboarding.section.serverUrl.title' as BaseTextKey)
								}}
							</h2>
						</header>
						<div :class="$style.sectionBody">
							<MCPOnboardingCopyBlock
								:content="serverUrl"
								copy-button-test-id="mcp-onboarding-copy-server-url-button"
								data-test-id="mcp-onboarding-claude-server-url"
							/>
						</div>
					</section>
				</template>
			</div>
		</template>

		<template #footer>
			<N8nText
				tag="p"
				size="xsmall"
				color="text-light"
				align="center"
				:class="$style.footer"
				data-test-id="mcp-onboarding-footer"
			>
				<I18nT keypath="settings.mcp.onboarding.footer" tag="span" scope="global">
					<template #settingsLink>
						<N8nLink
							:to="{ name: MCP_SETTINGS_VIEW }"
							size="xsmall"
							data-test-id="mcp-onboarding-settings-link"
						>
							{{ i18n.baseText('settings.mcp.onboarding.intro.settingsLink' as BaseTextKey) }}
						</N8nLink>
					</template>
					<template #docsLink>
						<N8nLink
							:href="MCP_ONBOARDING_DOCS_URL"
							target="_blank"
							rel="noopener noreferrer"
							size="xsmall"
							data-test-id="mcp-onboarding-docs-link"
						>
							{{ i18n.baseText('settings.mcp.onboarding.footer.docsLink' as BaseTextKey) }}
						</N8nLink>
					</template>
				</I18nT>
			</N8nText>
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
		padding-bottom: var(--spacing--sm);

		> :last-child {
			margin-top: var(--spacing--sm);
		}
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

// --- Section 2: access toggle row -----------------------------------------

.accessHeader {
	justify-content: space-between;
	gap: var(--spacing--md);
	width: 100%;

	@media (max-width: 600px) {
		align-items: flex-start;
		flex-direction: column;
	}
}

.accessTitleRow {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

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

.footer {
	margin: 0;
	padding: 0 var(--spacing--md);
	color: var(--text-color--subtler);
	line-height: 1.35;
}
</style>
