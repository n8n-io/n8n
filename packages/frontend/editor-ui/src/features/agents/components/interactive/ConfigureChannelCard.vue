<script lang="ts" setup>
/**
 * Card for the `configure_channel` builder tool. Thin transport adapter
 * around the shared `ChannelSetupCard` (body + composable wiring lives
 * there, identical to `InstanceAiChannelSetup.vue`'s) — this surface only
 * translates the shared `resolve` event into the agents-chat resume
 * transport (`submit` emit → `POST /build/resume` with `{ approved }`) and
 * renders the collapsed resolved-state summary once disabled.
 */
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ChannelResumeData } from '@n8n/api-types';
import { computed, ref } from 'vue';

import ChannelSetupCard from '@/features/ai/shared/components/ChannelSetupCard.vue';
import type { ChannelResolvedValue } from '@/features/ai/shared/agentsChat/types';

const props = defineProps<{
	integrationType: string;
	agentId: string;
	projectId: string;
	disabled?: boolean;
	resolvedValue?: ChannelResolvedValue;
}>();

const emit = defineEmits<{
	submit: [resumeData: ChannelResumeData];
}>();

const submitted = ref(false);

function onResolve({ approved }: { approved: boolean }) {
	if (submitted.value || props.disabled) return;
	submitted.value = true;
	emit('submit', { approved });
}

// ---------------------------------------------------------------------------
// Resolved (disabled) state
// ---------------------------------------------------------------------------

const i18n = useI18n();

const isChannelConnected = computed(() => {
	const value = props.resolvedValue;
	if (!value) return false;
	return 'connected' in value ? value.connected : value.approved;
});
</script>

<template>
	<ChannelSetupCard
		v-if="!disabled"
		data-testid="configure-channel-card"
		:integration-type="integrationType"
		:agent-id="agentId"
		:project-id="projectId"
		:disabled="submitted"
		@resolve="onResolve"
	/>

	<div v-else :class="$style.resolvedRow" data-testid="configure-channel-card">
		<template v-if="isChannelConnected">
			<N8nIcon icon="circle-check" size="small" color="success" />
			<N8nText size="small">{{ i18n.baseText('agents.channels.modal.connected') }}</N8nText>
		</template>
		<template v-else>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.chat.configureChannel.skipped') }}
			</N8nText>
		</template>
	</div>
</template>

<style lang="scss" module>
.resolvedRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
