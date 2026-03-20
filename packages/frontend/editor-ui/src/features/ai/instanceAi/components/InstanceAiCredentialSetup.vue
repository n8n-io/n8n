<script lang="ts" setup>
import { ref, computed } from 'vue';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiCredentialRequest, InstanceAiCredentialFlow } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { INSTANCE_AI_CREDENTIAL_SETUP_MODAL_KEY } from '@/app/constants';
import type { InstanceAiCredentialSetupModalData } from './InstanceAiCredentialSetupModal.vue';

const props = defineProps<{
	requestId: string;
	credentialRequests: InstanceAiCredentialRequest[];
	message: string;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();

const isFinalize = computed(() => props.credentialFlow?.stage === 'finalize');

const isSubmitted = ref(false);
const isDeferred = ref(false);

function getDisplayName(credentialType: string): string {
	return credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
}

function handleOpenModal() {
	const data: InstanceAiCredentialSetupModalData = {
		credentialRequests: props.credentialRequests,
		message: props.message,
		projectId: props.projectId,
		onComplete: (credentials: Record<string, string>) => {
			isSubmitted.value = true;
			store.resolveConfirmation(props.requestId);
			void store.confirmAction(props.requestId, true, undefined, credentials);
		},
	};
	uiStore.openModalWithData({
		name: INSTANCE_AI_CREDENTIAL_SETUP_MODAL_KEY,
		data: data as unknown as Record<string, unknown>,
	});
}

function handleLater() {
	isSubmitted.value = true;
	isDeferred.value = true;
	store.resolveConfirmation(props.requestId);
	void store.confirmAction(props.requestId, false);
}
</script>

<template>
	<div :class="$style.root">
		<div :class="$style.header">
			<N8nIcon icon="key-round" size="small" :class="$style.icon" />
			<span>{{ props.message }}</span>
		</div>

		<template v-if="!isSubmitted">
			<ul :class="$style.summaryList">
				<li
					v-for="req in props.credentialRequests"
					:key="req.credentialType"
					:class="$style.summaryItem"
				>
					<span :class="$style.credentialName">{{ getDisplayName(req.credentialType) }}</span>
					<span v-if="req.reason" :class="$style.credentialReason">{{ req.reason }}</span>
				</li>
			</ul>

			<div :class="$style.actions">
				<button :class="$style.secondaryButton" @click="handleLater">
					{{
						i18n.baseText(
							isFinalize ? 'instanceAi.credential.finalize.later' : 'instanceAi.credential.deny',
						)
					}}
				</button>
				<N8nButton
					size="small"
					:label="i18n.baseText('instanceAi.credential.setupButton')"
					data-test-id="instance-ai-credential-setup-button"
					@click="handleOpenModal"
				/>
			</div>
		</template>

		<div v-else :class="$style.submitted">
			<template v-if="isDeferred">
				<N8nIcon icon="arrow-right" size="small" :class="$style.skippedIcon" />
				<span>{{ i18n.baseText('instanceAi.credential.finalize.deferred') }}</span>
			</template>
			<template v-else>
				<N8nIcon icon="check" size="small" :class="$style.successIcon" />
				<span>{{
					i18n.baseText(
						isFinalize
							? 'instanceAi.credential.finalize.applied'
							: 'instanceAi.credential.allSelected',
					)
				}}</span>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	border-top: var(--border);
	padding: var(--spacing--xs);
	background: var(--color--background--shade-1);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-bottom: var(--spacing--xs);
}

.icon {
	color: var(--color--primary);
}

.summaryList {
	list-style: none;
	padding: 0;
	margin: 0 0 var(--spacing--xs) 0;
}

.summaryItem {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
}

.credentialName {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.credentialReason {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	align-items: center;
}

.secondaryButton {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: none;
	background: none;
	color: var(--color--text--tint-1);

	&:hover {
		color: var(--color--text);
		text-decoration: underline;
	}
}

.submitted {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.successIcon {
	color: var(--color--success);
}

.skippedIcon {
	color: var(--color--text--tint-2);
}
</style>
