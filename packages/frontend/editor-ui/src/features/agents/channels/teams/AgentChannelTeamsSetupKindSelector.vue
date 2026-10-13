<script setup lang="ts">
import { N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { AgentChannelRuntime } from '../types';
import { isTeamsChannelRuntime, type TeamsSetupKind } from './useTeamsChannelRuntime';

const props = defineProps<{
	runtime: AgentChannelRuntime;
	disabled?: boolean;
}>();

const i18n = useI18n();

const visible = computed(
	() =>
		isTeamsChannelRuntime(props.runtime) && props.runtime.managedSetup.value.managedSetupAvailable,
);

const setupKind = computed<TeamsSetupKind>({
	get: () => (isTeamsChannelRuntime(props.runtime) ? props.runtime.setupKind.value : 'managed'),
	set: (value) => {
		if (isTeamsChannelRuntime(props.runtime)) {
			props.runtime.setupKind.value = value;
		}
	},
});
</script>

<template>
	<N8nSelect
		v-if="visible"
		v-model="setupKind"
		:class="$style.teamsSetupKindSelector"
		:disabled="disabled"
		size="medium"
		:teleported="false"
		data-testid="teams-setup-kind-selector"
	>
		<N8nOption
			value="managed"
			:label="i18n.baseText('agents.channels.teams.setupKind.recommended')"
		/>
		<N8nOption value="manual" :label="i18n.baseText('agents.channels.teams.setupKind.manual')" />
	</N8nSelect>
</template>

<style module lang="scss">
.teamsSetupKindSelector {
	--input--radius: var(--radius--xs);

	width: 240px;
}
</style>
