<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system';
import type { AgentTeamsIntegrationSettings } from '@n8n/api-types';
import { computed, onMounted, ref, watch } from 'vue';

import type { AgentChannelViewExpose, AgentChannelViewProps } from '../types';
import AgentChannelTeamsManagedSetup from './AgentChannelTeamsManagedSetup.vue';
import AgentChannelTeamsSetup from './AgentChannelTeamsSetup.vue';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<
	Omit<AgentChannelViewProps, 'runtime'> & {
		runtime: TeamsChannelRuntime;
	}
>();
const emit = defineEmits<{
	create: [];
	edit: [];
	persist: [];
	/** The manual flow connects itself after a download, and from its retry. */
	connect: [];
	/** Either flow finishing: both outlive the connect and close themselves. */
	done: [];
}>();

const manualRef = ref<AgentChannelViewExpose>();
const managedRef = ref<{
	currentSettings: AgentTeamsIntegrationSettings;
	keepOpenAfterConnect?: boolean;
	canFinish?: boolean;
} | null>(null);
const showManaged = computed(
	() =>
		props.runtime.managedSetup.value.managedSetupAvailable &&
		props.runtime.setupKind.value === 'managed',
);

// Whichever flow is on screen owns the settings the save writes. Reading the
// manual one in managed mode silently stored the defaults.
const currentSettings = computed(() =>
	showManaged.value ? managedRef.value?.currentSettings : manualRef.value?.currentSettings,
);
const validationError = computed(() => manualRef.value?.validationError ?? null);
const loading = computed(
	() => props.loading || props.runtime.loading.value || manualRef.value?.loading === true,
);

// Opening a different agent should start on the recommended flow again, rather
// than inheriting whichever mode the last agent was left in.
watch(
	() => [props.projectId, props.agentId] as const,
	() => {
		props.runtime.setupKind.value = 'managed';
	},
	{ immediate: true },
);

/**
 * The skeleton stands in for a stepper that is not on screen yet. Once it is,
 * a reload is a refresh of what the user is already looking at -- swapping it
 * back for a skeleton collapses the dialog and loses the step they were on.
 * The state is reloaded whenever the credential modal closes, so that happens
 * in the middle of the flow rather than only at the start.
 */
const everLoaded = ref(false);
watch(
	() => props.runtime.loading.value,
	(isLoading, wasLoading) => {
		if (wasLoading && !isLoading) everLoaded.value = true;
	},
);
const showSkeleton = computed(() => props.runtime.loading.value && !everLoaded.value);

// The modal only loads runtimes for catalogued channel types, and Teams is
// hidden, so the setup asks for its own state rather than relying on that.
onMounted(() => {
	void props.runtime.load();
});

// Both flows have steps past the connect, so the modal has to let them say
// when they are finished rather than closing the moment the channel is bound.
const keepOpenAfterConnect = computed(() =>
	showManaged.value
		? managedRef.value?.keepOpenAfterConnect
		: manualRef.value?.keepOpenAfterConnect,
);

/**
 * Only the recommended flow outlives its connect by enough to need one: the
 * manual flow ends on the download it already offers.
 *
 * A channel that is already connected counts too. Reopening a finished setup
 * never runs the step that binds the credential, so the flow's own flag stays
 * false and the user lands on a finished setup with no way out but Cancel.
 */
const canFinish = computed(
	() => showManaged.value && (managedRef.value?.canFinish === true || props.connected),
);

/**
 * The manual flow saves by handing over a new package, which the modal drives
 * through these three. The wrapper forwards rather than declares them: only
 * the flow on screen knows whether a save has a package to produce, and the
 * recommended one never does.
 */
const saveLabel = computed(() => (showManaged.value ? undefined : manualRef.value?.saveLabel));
const beforeSave = async () => {
	if (!showManaged.value) await manualRef.value?.beforeSave?.();
};
const afterSave = async () => {
	if (!showManaged.value) await manualRef.value?.afterSave?.();
};

defineExpose({
	currentSettings,
	validationError,
	loading,
	keepOpenAfterConnect,
	canFinish,
	saveLabel,
	beforeSave,
	afterSave,
});
</script>

<template>
	<div :class="$style.view">
		<div v-if="showSkeleton" :class="$style.skeleton" data-testid="teams-managed-setup-skeleton">
			<N8nLoading variant="p" :rows="4" />
		</div>
		<AgentChannelTeamsManagedSetup
			v-else-if="showManaged"
			ref="managedRef"
			v-model="runtime.managerCredentialId.value"
			:runtime="runtime"
			:setup="runtime.managedSetup.value"
			:loading="loading"
			:credential-permissions="credentialPermissions"
			:saved-settings="savedSettings"
			:channel-connected="connected"
			:project-id="projectId"
			:agent-id="agentId"
			@provisioned="credentialId = $event"
			@persist="emit('persist')"
			@done="emit('done')"
		/>
		<AgentChannelTeamsSetup
			v-else
			ref="manualRef"
			v-model="credentialId"
			:mode="mode"
			:connected="connected"
			:is-published="isPublished"
			:project-id="projectId"
			:agent-id="agentId"
			:integration="integration"
			:credentials="credentials"
			:credential-permissions="credentialPermissions"
			:credentials-loading="credentialsLoading"
			:loading="loading"
			:disabled="disabled"
			:error-message="errorMessage"
			:error-is-conflict="errorIsConflict"
			:force-new-credential="forceNewCredential"
			:saved-settings="savedSettings"
			@create="emit('create')"
			@edit="emit('edit')"
			@connect="emit('connect')"
			@done="emit('done')"
		/>
	</div>
</template>

<style module lang="scss">
.view {
	display: contents;
}

.skeleton {
	padding-block: var(--spacing--xs);
}
</style>
