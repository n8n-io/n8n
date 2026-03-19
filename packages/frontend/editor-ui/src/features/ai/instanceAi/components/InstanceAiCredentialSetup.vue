<script lang="ts" setup>
import { ref, computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiCredentialRequest, InstanceAiCredentialFlow } from '@n8n/api-types';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{
	requestId: string;
	credentialRequests: InstanceAiCredentialRequest[];
	message: string;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();

const isFinalize = computed(() => props.credentialFlow?.stage === 'finalize');

// Track selected credential ID per type
const selections = ref<Record<string, string | null>>(
	Object.fromEntries(props.credentialRequests.map((r) => [r.credentialType, null])),
);
const isSubmitted = ref(false);
const isDeferred = ref(false);

const allSelected = computed(() =>
	props.credentialRequests.every((r) => selections.value[r.credentialType] !== null),
);

function handleCredentialSelected(credentialType: string, credentialId: string) {
	selections.value[credentialType] = credentialId;
}

function handleCredentialDeselected(credentialType: string) {
	selections.value[credentialType] = null;
}

function handleApply() {
	isSubmitted.value = true;
	const credentials: Record<string, string> = {};
	for (const [type, id] of Object.entries(selections.value)) {
		if (id) credentials[type] = id;
	}
	void store.confirmAction(props.requestId, true, undefined, credentials);
}

function handleLater() {
	isSubmitted.value = true;
	isDeferred.value = true;
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
			<div
				v-for="req in props.credentialRequests"
				:key="req.credentialType"
				:class="$style.credentialRow"
			>
				<div :class="$style.credentialLabel">
					<span :class="$style.credentialType">{{ req.credentialType }}</span>
					<span v-if="req.reason" :class="$style.credentialReason">{{ req.reason }}</span>
				</div>
				<CredentialPicker
					:app-name="req.credentialType"
					:credential-type="req.credentialType"
					:selected-credential-id="selections[req.credentialType]"
					:project-id="props.projectId"
					@credential-selected="handleCredentialSelected(req.credentialType, $event)"
					@credential-deselected="handleCredentialDeselected(req.credentialType)"
				/>
			</div>

			<div :class="$style.actions">
				<button :class="$style.secondaryButton" @click="handleLater">
					{{ i18n.baseText(isFinalize ? 'instanceAi.credential.finalize.later' : 'instanceAi.credential.deny') }}
				</button>
				<button
					:class="$style.primaryButton"
					:disabled="!allSelected"
					@click="handleApply"
				>
					{{ i18n.baseText(isFinalize ? 'instanceAi.credential.finalize.applyCredentials' : 'instanceAi.credential.useSelected') }}
				</button>
			</div>
		</template>

		<div v-else :class="$style.submitted">
			<template v-if="isDeferred">
				<N8nIcon icon="arrow-right" size="small" :class="$style.skippedIcon" />
				<span>{{ i18n.baseText('instanceAi.credential.finalize.deferred') }}</span>
			</template>
			<template v-else>
				<N8nIcon icon="check" size="small" :class="$style.successIcon" />
				<span>{{ i18n.baseText(isFinalize ? 'instanceAi.credential.finalize.applied' : 'instanceAi.credential.allSelected') }}</span>
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

.credentialRow {
	margin-bottom: var(--spacing--2xs);

	&:last-of-type {
		margin-bottom: var(--spacing--xs);
	}
}

.credentialLabel {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--4xs);
}

.credentialType {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	font-family: monospace;
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

.primaryButton {
	padding: var(--spacing--4xs) var(--spacing--sm);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: none;
	background: var(--color--primary);
	color: var(--button--color--text--primary);

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
