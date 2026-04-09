<script setup lang="ts">
/** Credit top-up “coming soon” dialog; purchase UI is in AiGatewayTopUpPurchasesPanel.vue (not mounted). */
import { computed } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogTitle,
	N8nHeading,
	N8nIcon,
	N8nLink,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';

const FEEDBACK_FORM_URL = 'https://forms.gle/placeholder';

const i18n = useI18n();
const uiStore = useUIStore();

const isOpen = computed(() => Boolean(uiStore.modalsById[AI_GATEWAY_TOP_UP_MODAL_KEY]?.open));

function onUpdateOpen(value: boolean) {
	if (!value) {
		uiStore.closeModal(AI_GATEWAY_TOP_UP_MODAL_KEY);
	}
}

function openFeedbackForm() {
	window.open(FEEDBACK_FORM_URL, '_blank', 'noopener,noreferrer');
}
</script>

<template>
	<N8nDialog
		:open="isOpen"
		size="medium"
		data-test-id="ai-gateway-topup-modal"
		@update:open="onUpdateOpen"
	>
		<div :class="$style.content">
			<N8nIcon icon="hourglass" size="xlarge" color="text-base" :class="$style.titleIcon" />
			<N8nDialogTitle as-child>
				<N8nHeading tag="h2" size="large" :class="$style.title">
					{{ i18n.baseText('settings.n8nGateway.topUp.comingSoon.title') }}
				</N8nHeading>
			</N8nDialogTitle>

			<div :class="$style.body">
				<p :class="$style.bodyParagraph">
					{{ i18n.baseText('settings.n8nGateway.topUp.comingSoon.paragraph1') }}
				</p>
				<p :class="[$style.bodyParagraph, $style.paragraphWithLink]">
					<span>{{ i18n.baseText('settings.n8nGateway.topUp.comingSoon.paragraph2a') }}</span
					><N8nLink
						:to="FEEDBACK_FORM_URL"
						new-window
						:underline="true"
						data-test-id="ai-gateway-topup-feedback-link"
					>
						{{ i18n.baseText('settings.n8nGateway.topUp.comingSoon.feedbackLinkLabel') }}</N8nLink
					><span>{{ i18n.baseText('settings.n8nGateway.topUp.comingSoon.paragraph2b') }}</span>
				</p>
				<p :class="$style.bodyParagraph">
					{{ i18n.baseText('settings.n8nGateway.topUp.comingSoon.paragraph3') }}
				</p>
			</div>

			<div :class="$style.footerRow">
				<N8nButton
					variant="outline"
					size="small"
					data-test-id="ai-gateway-topup-send-feedback"
					@click="openFeedbackForm"
				>
					{{ i18n.baseText('settings.n8nGateway.topUp.comingSoon.sendFeedback') }}
				</N8nButton>
			</div>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--sm);
}

.titleIcon {
	flex-shrink: 0;
}

.title {
	margin: 0;
	max-width: 100%;
	text-align: center;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.bodyParagraph {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	font-weight: var(--font-weight--regular);
	color: var(--color--text);
	text-align: center;
}

.paragraphWithLink {
	span {
		display: inline;
	}

	:global(.n8n-link) {
		display: inline;
		vertical-align: baseline;
	}
}

.footerRow {
	display: flex;
	justify-content: center;
	margin-top: var(--spacing--xs);
	width: 100%;
}
</style>
