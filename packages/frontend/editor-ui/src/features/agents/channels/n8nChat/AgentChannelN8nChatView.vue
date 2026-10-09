<script setup lang="ts">
import { AGENT_DESCRIPTION_MAX_LENGTH } from '@n8n/api-types';
import { N8nCallout, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { I18nT } from 'vue-i18n';

import { useAgentProjectBreadcrumb } from '../../composables/useAgentProjectBreadcrumb';
import type { AgentChannelViewProps } from '../types';

const props = defineProps<AgentChannelViewProps & { savedDescription?: string }>();

const i18n = useI18n();
const { projectName } = useAgentProjectBreadcrumb(computed(() => props.projectId));

const description = ref(props.savedDescription ?? '');

defineExpose({ description });
</script>

<template>
	<div :class="$style.editView">
		<N8nCallout theme="info">
			<I18nT keypath="agents.channels.n8nChat.callout" scope="global">
				<template #projectName
					><strong>{{ projectName }}</strong></template
				>
			</I18nT>
		</N8nCallout>
		<div :class="$style.descriptionBlock">
			<div :class="$style.labelRow">
				<N8nText bold size="medium" color="text-dark">
					{{ i18n.baseText('agents.channels.n8nChat.description.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.channels.n8nChat.description.optional') }}
				</N8nText>
			</div>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.channels.n8nChat.description.hint') }}
			</N8nText>
			<N8nInput
				v-model="description"
				type="textarea"
				:rows="3"
				:maxlength="AGENT_DESCRIPTION_MAX_LENGTH"
				:placeholder="i18n.baseText('agents.channels.n8nChat.description.placeholder')"
				data-testid="agent-channel-n8n-chat-description"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.descriptionBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.labelRow {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
}
</style>
