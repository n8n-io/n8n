<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { AskCredentialResume } from '@n8n/api-types';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';

const props = defineProps<{
	purpose: string;
	credentialType: string;
	nodeType?: string;
	credentialSlot?: string;
	projectId: string;
	agentId: string;
	disabled?: boolean;
	resolvedValue?: AskCredentialResume;
}>();

const emit = defineEmits<{
	submit: [resumeData: { credentialId: string; credentialName: string } | { skipped: true }];
}>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();

// ---------------------------------------------------------------------------
// Selection state — driven entirely by NodeCredentials' credentialSelected event
// ---------------------------------------------------------------------------

const selectedId = ref<string>('');
const selectedCredential = computed(() =>
	selectedId.value ? credentialsStore.getCredentialById(selectedId.value) : null,
);

/**
 * Synthetic node passed to NodeCredentials. We use `noOp` as the carrier node
 * type because the component only needs *some* INodeUi to attach the selected
 * credential to; the actual credential type is forced via `override-cred-type`.
 * This mirrors the pattern used in InstanceAiCredentialSetup.vue.
 */
const nodeForCredentials = computed<INodeUi>(() => {
	const cred = selectedCredential.value;
	return {
		id: props.credentialType,
		name: props.credentialType,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: cred ? { [props.credentialType]: { id: cred.id, name: cred.name } } : {},
	} as INodeUi;
});

function onCredentialSelected(info: INodeUpdatePropertiesInformation) {
	if (props.disabled) return;
	const data = info.properties.credentials?.[props.credentialType];
	if (data && typeof data === 'object' && data.id) {
		if (data.id === selectedId.value) return;
		selectedId.value = data.id;
		emit('submit', {
			credentialId: data.id,
			credentialName: data.name ?? selectedCredential.value?.name ?? '',
		});
	} else {
		selectedId.value = '';
	}
}

// ---------------------------------------------------------------------------
// Submit / skip
// ---------------------------------------------------------------------------
//
// Credentials + credential types are pre-fetched by AgentBuilderView when the
// agent loads, so NodeCredentials renders against an already-warm store.

function onSkip() {
	if (props.disabled) return;
	emit('submit', { skipped: true });
}
</script>

<template>
	<N8nCard :class="[$style.card, disabled && $style.disabled]" data-testid="ask-credential-card">
		<div :class="$style.cardBody">
			<N8nText tag="p" bold :class="$style.purpose">{{ purpose }}</N8nText>

			<div :class="$style.credentialContainer">
				<NodeCredentials
					:node="nodeForCredentials"
					:override-cred-type="credentialType"
					:project-id="projectId"
					:readonly="disabled"
					standalone
					hide-issues
					skip-auto-select
					@credential-selected="onCredentialSelected"
				/>
			</div>

			<div v-if="!disabled" :class="$style.actions">
				<N8nButton
					size="medium"
					variant="outline"
					data-testid="ask-credential-skip"
					@click="onSkip"
				>
					{{ i18n.baseText('agents.chat.askCredential.skip') }}
				</N8nButton>
			</div>
			<div v-else :class="$style.resolvedRow">
				<template v-if="resolvedValue && 'skipped' in resolvedValue">
					<N8nText size="small" color="text-light">Skipped</N8nText>
				</template>
				<template v-else>
					<N8nIcon icon="circle-check" size="small" color="success" />
					<N8nText size="small">
						{{
							(resolvedValue && 'credentialName' in resolvedValue
								? resolvedValue.credentialName
								: null) ??
							selectedCredential?.name ??
							'—'
						}}
					</N8nText>
				</template>
			</div>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	--card--padding: var(--spacing--sm);

	gap: var(--spacing--xs);
	width: 90%;
	max-width: 90%;
}

.disabled {
	opacity: 0.75;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.purpose {
	margin: 0;
	font-size: var(--font-size--sm);
}

.credentialContainer {
	display: flex;
	flex-direction: column;

	// NodeCredentials adds its own top margin which double-stacks inside our card chrome.
	:global(.node-credentials) {
		margin-top: 0;
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
}

.resolvedRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--success);
}
</style>
