<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import SurfaceMcpBridgeGraphic from '@/experiments/surfaceMcpToNewCloudUsers/components/SurfaceMcpBridgeGraphic.vue';
import {
	SURFACE_MCP_FIRST_OPEN_INTRO_MODAL_KEY,
	SURFACE_MCP_ONBOARDING_MODAL_KEY,
} from '@/experiments/surfaceMcpToNewCloudUsers/constants';
import { useSurfaceMcpToNewCloudUsersStore } from '@/experiments/surfaceMcpToNewCloudUsers/stores/surfaceMcpToNewCloudUsers.store';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import { N8nButton, N8nHeading, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { I18nT } from 'vue-i18n';

const props = defineProps<{
	modalName?: string;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const surfaceMcpStore = useSurfaceMcpToNewCloudUsersStore();
const modalBus = createEventBus();
const exitMode = ref<'none' | 'skip' | 'try'>('none');

const modalName = computed(() => props.modalName ?? SURFACE_MCP_FIRST_OPEN_INTRO_MODAL_KEY);

function dismissExperiment() {
	surfaceMcpStore.dismissFirstOpenModal();
	surfaceMcpStore.trackDismissed('first_open_modal');
}

function handleSkip() {
	if (exitMode.value !== 'none') {
		return;
	}

	exitMode.value = 'skip';
	dismissExperiment();
	uiStore.closeModal(modalName.value);
}

function handleTryIt() {
	if (exitMode.value !== 'none') {
		return;
	}

	exitMode.value = 'try';
	uiStore.closeModal(modalName.value);
	uiStore.openModalWithData({
		name: SURFACE_MCP_ONBOARDING_MODAL_KEY,
		data: { surface: 'first_open_modal' },
	});
}

function handleClosed() {
	if (exitMode.value !== 'none') {
		return;
	}

	exitMode.value = 'skip';
	dismissExperiment();
}

onMounted(() => {
	modalBus.on('closed', handleClosed);
});

onBeforeUnmount(() => {
	modalBus.off('closed', handleClosed);
});
</script>

<template>
	<Modal
		:name="modalName"
		width="640px"
		:event-bus="modalBus"
		:close-on-click-modal="true"
		:close-on-press-escape="true"
		:center="false"
		:custom-class="$style.modal"
	>
		<template #header>
			<div :class="$style.hero">
				<div :class="$style.heroBackdrop" aria-hidden="true" />
				<div :class="$style.heroGraphic">
					<SurfaceMcpBridgeGraphic size="hero" />
				</div>
			</div>
		</template>

		<template #content>
			<div :class="$style.content" data-test-id="surface-mcp-intro-content">
				<N8nText size="xsmall" color="primary" :bold="true" :class="$style.eyebrow">
					{{ i18n.baseText('experiments.surfaceMcpToNewCloudUsers.onboarding.intro.eyebrow') }}
				</N8nText>
				<N8nHeading tag="h1" size="xlarge" :bold="true" :class="$style.title">
					{{ i18n.baseText('experiments.surfaceMcpToNewCloudUsers.onboarding.intro.title') }}
				</N8nHeading>
				<N8nText tag="p" size="medium" color="text-base" :class="$style.description">
					{{ i18n.baseText('experiments.surfaceMcpToNewCloudUsers.onboarding.intro.description') }}
					{{ ' ' }}
					<I18nT
						keypath="experiments.surfaceMcpToNewCloudUsers.onboarding.intro.settingsHint"
						tag="span"
						scope="global"
					>
						<template #settingsLink>
							<N8nLink
								:to="{ name: MCP_SETTINGS_VIEW }"
								size="medium"
								data-test-id="surface-mcp-intro-settings-link"
							>
								{{
									i18n.baseText(
										'experiments.surfaceMcpToNewCloudUsers.onboarding.intro.settingsLink' as BaseTextKey,
									)
								}}
							</N8nLink>
						</template>
					</I18nT>
				</N8nText>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					data-test-id="surface-mcp-intro-skip-button"
					@click="handleSkip"
				>
					{{ i18n.baseText('experiments.surfaceMcpToNewCloudUsers.onboarding.intro.skip') }}
				</N8nButton>
				<N8nButton
					data-test-id="surface-mcp-intro-try-button"
					:class="$style.tryButton"
					@click="handleTryIt"
				>
					{{ i18n.baseText('experiments.surfaceMcpToNewCloudUsers.onboarding.intro.tryIt') }}
				</N8nButton>
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

// --- Hero (full-bleed) ----------------------------------------------------

.hero {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 200px;
	padding: var(--spacing--xl) var(--spacing--lg);
	overflow: hidden;
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}

.heroBackdrop {
	position: absolute;
	inset: 0;
	background: radial-gradient(
		60% 80% at 50% 40%,
		rgb(234 152 75 / 14%) 0%,
		rgb(234 152 75 / 0%) 100%
	);
	pointer-events: none;
}

.heroGraphic {
	position: relative;

	@include motion.fade-in-up;

	animation-duration: var(--duration--base);
}

// --- Copy block -----------------------------------------------------------

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--3xs);
	max-width: 60ch;
	margin: 0 auto;
	padding-bottom: var(--spacing--xs);
	text-align: center;
}

.eyebrow {
	text-transform: uppercase;
	letter-spacing: var(--letter-spacing--widest);
	color: var(--color--orange-700);
}

.title {
	letter-spacing: var(--letter-spacing--tight);
}

.description {
	margin-top: var(--spacing--3xs);
	line-height: 1.55;
}

// --- Footer ---------------------------------------------------------------

.footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
}

.tryButton {
	min-width: 132px;
}
</style>
