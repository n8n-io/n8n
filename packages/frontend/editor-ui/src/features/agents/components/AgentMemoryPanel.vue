<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AgentMemoryProfilesResponse } from '@n8n/api-types';
import { N8nCollapsiblePanel, N8nText, N8nSwitch } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getAgentMemoryProfiles } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';
import AgentMiniEditor from './AgentMiniEditor.vue';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		projectId?: string;
		agentId?: string;
		disabled?: boolean;
	}>(),
	{ agentId: undefined, disabled: false, projectId: undefined },
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const rootStore = useRootStore();
const memory = computed(() => (props.config?.memory?.enabled ? props.config.memory : null));
const canLoadProfiles = computed(
	() => !props.disabled && Boolean(props.projectId && props.agentId),
);
const profilesExpanded = ref(false);
const profilesLoaded = ref(false);
const profilesLoading = ref(false);
const profilesError = ref(false);
const profiles = ref<AgentMemoryProfilesResponse | null>(null);

function onEnableMemory() {
	const existingMemory = props.config?.memory;
	emit('update:config', {
		memory: {
			...existingMemory,
			enabled: true,
			storage: 'n8n',
			lastMessages: existingMemory?.lastMessages ?? 10,
		},
	});
}

function onDisableMemory() {
	emit('update:config', {
		memory: { ...(props.config?.memory ?? { storage: 'n8n' as const }), enabled: false },
	});
}

function onMemoryToggle(enabled: boolean) {
	if (enabled) {
		onEnableMemory();
	} else {
		onDisableMemory();
	}
}

async function loadProfiles() {
	if (!canLoadProfiles.value || !props.projectId || !props.agentId) return;

	profilesLoading.value = true;
	profilesError.value = false;

	try {
		profiles.value = await getAgentMemoryProfiles(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		profilesLoaded.value = true;
	} catch {
		profilesError.value = true;
	} finally {
		profilesLoading.value = false;
	}
}

function onProfilesExpandedChange(expanded: boolean) {
	profilesExpanded.value = expanded;
	if (expanded && !profilesLoaded.value && !profilesLoading.value) {
		void loadProfiles();
	}
}
</script>

<template>
	<div
		:class="[$style.container, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
	>
		<div :class="$style.row">
			<div :class="$style.titleGroup">
				<N8nText tag="h3" :bold="true">{{ i18n.baseText('agents.builder.memory.title') }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.memory.description') }}
				</N8nText>
			</div>
			<N8nSwitch
				:model-value="memory !== null"
				:disabled="props.disabled"
				data-testid="agent-memory-toggle"
				@update:model-value="onMemoryToggle"
			/>
		</div>

		<N8nCollapsiblePanel
			:model-value="profilesExpanded"
			:title="i18n.baseText('agents.builder.memory.profiles.title')"
			:disabled="!canLoadProfiles"
			:class="$style.profilePanel"
			data-testid="agent-memory-profiles-panel"
			@update:model-value="onProfilesExpandedChange"
		>
			<div v-if="profilesExpanded" :class="$style.profilesContent">
				<N8nText
					v-if="profilesLoading"
					:class="$style.profileStatus"
					size="small"
					color="text-light"
				>
					{{ i18n.baseText('agents.builder.memory.profiles.loading') }}
				</N8nText>
				<N8nText
					v-else-if="profilesError"
					:class="$style.profileStatus"
					size="small"
					color="danger"
				>
					{{ i18n.baseText('agents.builder.memory.profiles.error') }}
				</N8nText>
				<template v-else>
					<section :class="$style.profileSection">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.memory.profiles.userProfile.description') }}
						</N8nText>
						<AgentMiniEditor
							:class="$style.profileEditor"
							:model-value="
								profiles?.userProfile ??
								i18n.baseText('agents.builder.memory.profiles.userProfile.empty')
							"
							language="markdown"
							readonly
							min-height="240px"
							max-height="240px"
							data-testid="agent-memory-user-profile"
						/>
					</section>
				</template>
			</div>
		</N8nCollapsiblePanel>
	</div>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	height: 100%;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.titleGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	flex: 1;
	min-width: 0;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.disabled {
	opacity: 0.6;
}

.profilePanel.profilePanel {
	border: 0;
	border-radius: 0;
	background-color: transparent;
	scroll-margin-bottom: 0;
}

.profilePanel.profilePanel > :first-child {
	padding: 0;
	min-height: auto;
}

.profilesContent {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--spacing--lg);
	border-top: var(--border);
	margin-top: var(--spacing--sm);
	padding-top: var(--spacing--sm);
}

.profilePanel.profilePanel > [data-state] > .profilesContent {
	padding-top: var(--spacing--sm);
}

.profileStatus {
	grid-column: 1 / -1;
}

.profileSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
}

.profileEditor {
	height: 240px;
	min-height: 0;
	display: flex;
}

.profileEditor > :global(.cm-editor) {
	flex: 1;
	min-height: 0;
}
</style>
