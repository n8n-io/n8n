<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
	N8nSwitch,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import { AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE } from '../constants';
import { useAgentProjectId } from '../composables/useAgentProjectId';
import AgentPanel from './AgentPanel.vue';

import type { AgentJsonConfig } from '../types';
import shared from '../styles/agent-panel.module.scss';

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; embedded?: boolean }>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const credentialDialogOpen = ref(false);
const settingsStore = useSettingsStore();
const projectId = useAgentProjectId();
const episodicMemory = computed(() => props.config?.memory?.episodicMemory ?? null);
const episodicMemoryEnabled = computed(() => episodicMemory.value?.enabled === true);
const isAiAssistantProxyEnabled = computed(
	() => settingsStore.moduleSettings.agents?.proxyEnabled === true,
);

function buildEnabledMemoryConfig() {
	const existingMemory = props.config?.memory;

	return {
		...existingMemory,
		enabled: true,
		storage: 'n8n' as const,
	};
}

function enableEpisodicMemory(credentialId: string) {
	const existingMemory = props.config?.memory;
	const existingEpisodicMemory = existingMemory?.episodicMemory;
	emit('update:config', {
		memory: {
			...buildEnabledMemoryConfig(),
			episodicMemory: {
				...(existingEpisodicMemory?.enabled === true ? existingEpisodicMemory : {}),
				enabled: true,
				credential: credentialId,
			},
		},
	});
}

function disableEpisodicMemory() {
	emit('update:config', {
		memory: {
			...buildEnabledMemoryConfig(),
			episodicMemory: { enabled: false },
		},
	});
}

function onCredentialSelected(credentialId: string) {
	enableEpisodicMemory(credentialId);
	credentialDialogOpen.value = false;
}

function onEpisodicMemoryToggle(enabled: boolean) {
	if (!enabled) {
		disableEpisodicMemory();
		return;
	}

	if (isAiAssistantProxyEnabled.value) {
		enableEpisodicMemory(MANAGED_CREDENTIAL_TOKEN);
		return;
	}

	credentialDialogOpen.value = true;
}
</script>

<template>
	<AgentPanel
		:header="i18n.baseText('agents.builder.memory.title')"
		:description="i18n.baseText('agents.builder.memory.description')"
	>
		<template #header-actions>
			<N8nText step="sm" color="text-light">
				{{ i18n.baseText('agents.builder.memory.alwaysOn') }}
			</N8nText>
		</template>

		<div :class="$style.row">
			<div :class="$style.titleGroup">
				<N8nText step="sm" bold :class="shared.dataEntryLabel">
					{{ i18n.baseText('agents.builder.memory.episodicMemory.label') }}
				</N8nText>
				<N8nText step="sm" color="text-light">
					{{ i18n.baseText('agents.builder.memory.episodicMemory.hint') }}
				</N8nText>
				<N8nButton
					v-if="episodicMemoryEnabled && !isAiAssistantProxyEnabled"
					variant="ghost"
					size="small"
					:disabled="props.disabled"
					:class="$style.changeCredentialButton"
					data-testid="agent-episodic-memory-change-credential"
					@click="credentialDialogOpen = true"
				>
					{{
						i18n.baseText('agents.builder.memory.episodicMemory.changeCredential' as BaseTextKey)
					}}
				</N8nButton>
			</div>
			<N8nSwitch
				:model-value="episodicMemoryEnabled"
				:disabled="props.disabled"
				:class="$style.switch"
				data-testid="agent-episodic-memory-toggle"
				@update:model-value="(value) => onEpisodicMemoryToggle(Boolean(value))"
			/>
		</div>
		<N8nDialog
			:open="credentialDialogOpen"
			size="medium"
			@update:open="credentialDialogOpen = $event"
		>
			<N8nDialogHeader>
				<N8nDialogTitle>
					{{
						i18n.baseText(
							'agents.builder.memory.episodicMemory.credentialDialog.title' as BaseTextKey,
						)
					}}
				</N8nDialogTitle>
			</N8nDialogHeader>
			<div :class="$style.dialogContent">
				<div :class="$style.row">
					<div :class="$style.titleGroup">
						<N8nText step="sm" bold :class="shared.dataEntryLabel">
							{{
								i18n.baseText(
									'agents.builder.memory.episodicMemory.credential.label' as BaseTextKey,
								)
							}}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('agents.builder.memory.episodicMemory.credential.hint' as BaseTextKey)
							}}
						</N8nText>
					</div>
					<div :class="$style.credentialPicker">
						<CredentialPicker
							app-name="OpenAI"
							size="medium"
							button-size="large"
							:credential-type="AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE"
							:selected-credential-id="null"
							:project-id="projectId"
							:show-delete="false"
							:hide-create-new="false"
							:teleported="false"
							credential-modal-append-to-body
							:class="$style.credentialPicker"
							data-testid="agent-episodic-memory-credential-picker"
							@credential-selected="onCredentialSelected"
						/>
					</div>
				</div>
			</div>
		</N8nDialog>
	</AgentPanel>
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
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.titleGroup > :global(.n8n-text) {
	max-width: 100%;
	overflow-wrap: anywhere;
}

.dialogContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding-top: var(--spacing--lg);
}

.dialogContent .row {
	flex-direction: column;
	align-items: stretch;
}

.dialogContent .credentialPicker {
	flex-basis: auto;
	width: 100%;
	max-width: none;
	margin-left: 0;
}

.credentialPicker input {
	min-height: 36px;
	height: 36px;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.switch {
	flex-shrink: 0;
}

.changeCredentialButton {
	align-self: flex-start;
}

.credentialPicker {
	display: flex;
	flex: 0 1 280px;
	justify-content: flex-end;
	margin-left: auto;
	min-width: min(280px, 100%);
}

.credentialPicker > * {
	width: 100%;
}
</style>
