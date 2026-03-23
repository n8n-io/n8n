<script lang="ts" setup>
import { ref, computed } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiCredentialRequest, InstanceAiCredentialFlow } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import WizardNavigationFooter from '@/features/ai/shared/components/WizardNavigationFooter.vue';
import { useWizardNavigation } from '@/features/ai/shared/composables/useWizardNavigation';

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

const totalSteps = computed(() => props.credentialRequests.length);

const { currentStepIndex, isPrevDisabled, isNextDisabled, goToNext, goToPrev } =
	useWizardNavigation({ totalSteps });

const isFinalize = computed(() => props.credentialFlow?.stage === 'finalize');

const isSubmitted = ref(false);
const isDeferred = ref(false);

const selections = ref<Record<string, string | null>>(
	Object.fromEntries(props.credentialRequests.map((r) => [r.credentialType, null])),
);

const currentRequest = computed(() => props.credentialRequests[currentStepIndex.value]);

const allSelected = computed(() =>
	props.credentialRequests.every((r) => selections.value[r.credentialType] !== null),
);

const currentSelected = computed(
	() => currentRequest.value && selections.value[currentRequest.value.credentialType] !== null,
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
			<div
				v-if="currentRequest"
				data-test-id="instance-ai-credential-card"
				:class="[$style.card, { [$style.completed]: allSelected }]"
			>
				<!-- Header -->
				<header :class="$style.header">
					<CredentialIcon :credential-type-name="currentRequest.credentialType" :size="16" />
					<N8nText :class="$style.title" size="medium" color="text-dark" bold>
						{{ getDisplayName(currentRequest.credentialType) }}
					</N8nText>
					<N8nText
						v-if="currentSelected"
						data-test-id="instance-ai-credential-step-check"
						:class="$style.completeLabel"
						size="medium"
						color="success"
					>
						<N8nIcon icon="check" size="large" />
					</N8nText>
				</header>

				<!-- Content -->
				<div :class="$style.content">
					<N8nText
						v-if="currentRequest.reason"
						:class="$style.reason"
						size="small"
						color="text-light"
					>
						{{ currentRequest.reason }}
					</N8nText>

					<CredentialPicker
						:key="currentRequest.credentialType"
						:app-name="getDisplayName(currentRequest.credentialType)"
						:credential-type="currentRequest.credentialType"
						:selected-credential-id="selections[currentRequest.credentialType]"
						:project-id="props.projectId"
						create-button-variant="outline"
						@credential-selected="handleCredentialSelected(currentRequest.credentialType, $event)"
						@credential-deselected="handleCredentialDeselected(currentRequest.credentialType)"
					/>
				</div>

				<!-- Footer -->
				<WizardNavigationFooter
					:step-index="currentStepIndex"
					:total-steps="totalSteps"
					:is-prev-disabled="isPrevDisabled"
					:is-next-disabled="isNextDisabled"
					@prev="goToPrev"
					@next="goToNext"
				>
					<template #actions>
						<button :class="$style.secondaryButton" @click="handleLater">
							{{
								i18n.baseText(
									isFinalize
										? 'instanceAi.credential.finalize.later'
										: 'instanceAi.credential.deny',
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
					</template>
				</WizardNavigationFooter>
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
	background: var(--color--background--shade-1);
	padding: var(--spacing--xs);
}

.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0;
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);

	&.completed {
		border-color: var(--color--success);
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.title {
	flex: 1;
}

.completeLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--sm);

	:global([data-test-id='create-credential']) {
		width: auto;
	}
}

.reason {
	color: var(--color--text--tint-1);
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
