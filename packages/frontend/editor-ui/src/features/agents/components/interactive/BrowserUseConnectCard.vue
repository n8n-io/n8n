<script setup lang="ts">
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	BrowserUseConnectInput,
	BrowserUseConnectResume,
} from '@/features/ai/shared/agentsChat/types';

/**
 * Rendered when a Browser Use tool suspends because no browser is connected.
 * The link opens the public setup page; the button resumes the agent run once
 * the user has connected their extension.
 */
const props = defineProps<{
	input: BrowserUseConnectInput;
	resolvedValue?: BrowserUseConnectResume;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [resumeData: BrowserUseConnectResume];
}>();

const i18n = useI18n();

function submit() {
	emit('submit', { type: 'button', value: 'continue' });
}
</script>

<template>
	<N8nCard :class="[$style.card, props.disabled && $style.disabled]" data-testid="browser-use-card">
		<div :class="$style.body">
			<N8nText tag="p" bold :class="$style.title">
				{{ props.input.title || i18n.baseText('agents.browserUse.connect.title') }}
			</N8nText>

			<N8nText tag="p" size="small" color="text-light">
				{{ i18n.baseText('agents.browserUse.connect.description') }}
			</N8nText>

			<N8nButton
				:label="i18n.baseText('agents.browserUse.card.openSetup')"
				:href="props.input.setupUrl"
				target="_blank"
				variant="solid"
				size="medium"
				icon="external-link"
				data-testid="browser-use-card-open-setup"
			/>

			<div v-if="props.disabled && props.resolvedValue" :class="$style.resolved">
				<N8nIcon icon="circle-check" size="small" color="success" />
				<N8nText size="small">{{ i18n.baseText('agents.browserUse.card.resumed') }}</N8nText>
			</div>
			<N8nButton
				v-else
				:label="i18n.baseText('agents.browserUse.card.continue')"
				variant="outline"
				size="medium"
				:disabled="props.disabled"
				data-testid="browser-use-card-continue"
				@click="submit"
			/>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	margin-top: var(--spacing--2xs);
}

.disabled {
	opacity: 0.7;
}

.body {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.title {
	margin: 0;
}

.resolved {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
