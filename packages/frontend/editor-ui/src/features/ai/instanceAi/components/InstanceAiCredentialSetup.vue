<script lang="ts" setup>
import { ref, computed } from 'vue';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiCredentialRequest, InstanceAiCredentialFlow } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';

const props = defineProps<{
	requestId: string;
	credentialRequests: InstanceAiCredentialRequest[];
	message: string;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const credentialsStore = useCredentialsStore();

const isFinalize = computed(() => props.credentialFlow?.stage === 'finalize');

const isSubmitted = ref(false);
const isDeferred = ref(false);

const selections = ref<Record<string, string | null>>(
	Object.fromEntries(props.credentialRequests.map((r) => [r.credentialType, null])),
);

const allSelected = computed(() =>
	props.credentialRequests.every((r) => selections.value[r.credentialType] !== null),
);

function getDisplayName(credentialType: string): string {
	return credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
}

function handleCredentialSelected(credentialType: string, credentialId: string) {
	selections.value[credentialType] = credentialId;
}

function handleCredentialDeselected(credentialType: string) {
	selections.value[credentialType] = null;
}

function handleContinue() {
	const credentials: Record<string, string> = {};
	for (const [type, id] of Object.entries(selections.value)) {
		if (id) credentials[type] = id;
	}
	isSubmitted.value = true;
	store.resolveConfirmation(props.requestId, 'approved');
	void store.confirmAction(props.requestId, true, undefined, credentials);
}

function handleLater() {
	isSubmitted.value = true;
	isDeferred.value = true;
	store.resolveConfirmation(props.requestId, 'deferred');
	void store.confirmAction(props.requestId, false);
}
</script>

<template>
	<div :class="$style.root">
		<template v-if="!isSubmitted">
			<ul :class="$style.credentialList">
				<li
					v-for="req in props.credentialRequests"
					:key="req.credentialType"
					:class="$style.credentialRow"
				>
					<N8nIcon icon="key-round" size="small" :class="$style.icon" />
					<div :class="$style.credentialText">
						<span :class="$style.credentialName">{{ getDisplayName(req.credentialType) }}</span>
						<span v-if="req.reason" :class="$style.credentialReason">{{ req.reason }}</span>
					</div>
					<span :class="$style.picker">
						<CredentialPicker
							:app-name="getDisplayName(req.credentialType)"
							:credential-type="req.credentialType"
							:selected-credential-id="selections[req.credentialType]"
							:project-id="props.projectId"
							create-button-variant="outline"
							@credential-selected="handleCredentialSelected(req.credentialType, $event)"
							@credential-deselected="handleCredentialDeselected(req.credentialType)"
						/>
					</span>
					<N8nIcon
						v-if="selections[req.credentialType]"
						icon="check"
						size="small"
						:class="$style.checkIcon"
					/>
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
					:label="i18n.baseText('instanceAi.credential.continueButton')"
					:disabled="!allSelected"
					data-test-id="instance-ai-credential-continue-button"
					@click="handleContinue"
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

.credentialList {
	list-style: none;
	padding: 0;
	margin: 0 0 var(--spacing--xs) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.credentialRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
}

.icon {
	color: var(--color--primary);
	flex-shrink: 0;
}

.credentialText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	flex: 1;
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

.picker {
	margin-left: auto;
	flex-shrink: 0;
}

.checkIcon {
	color: var(--color--success);
	flex-shrink: 0;
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
