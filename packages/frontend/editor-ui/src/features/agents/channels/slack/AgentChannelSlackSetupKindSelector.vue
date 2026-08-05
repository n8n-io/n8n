<script setup lang="ts">
import { N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { AgentChannelRuntime } from '../types';
import { isSlackChannelRuntime, type SlackSetupKind } from './useSlackChannelRuntime';

const props = defineProps<{
	runtime: AgentChannelRuntime;
	disabled?: boolean;
}>();

const i18n = useI18n();

const visible = computed(
	() => isSlackChannelRuntime(props.runtime) && props.runtime.setup.value.managedSetupAvailable,
);

const setupKind = computed<SlackSetupKind>({
	get: () => (isSlackChannelRuntime(props.runtime) ? props.runtime.setupKind.value : 'managed'),
	set: (value) => {
		if (isSlackChannelRuntime(props.runtime)) {
			props.runtime.setupKind.value = value;
		}
	},
});
</script>

<template>
	<N8nSelect
		v-if="visible"
		v-model="setupKind"
		:class="$style.slackSetupKindSelector"
		:disabled="disabled"
		size="medium"
		:teleported="false"
		data-testid="slack-setup-kind-selector"
	>
		<N8nOption
			value="managed"
			:label="i18n.baseText('agents.channels.slack.setupKind.recommended')"
		/>
		<N8nOption value="manual" :label="i18n.baseText('agents.channels.slack.setupKind.manual')" />
	</N8nSelect>
</template>

<style module lang="scss">
.slackSetupKindSelector {
	--input--radius: var(--radius--xs);

	width: 240px;
}
</style>
