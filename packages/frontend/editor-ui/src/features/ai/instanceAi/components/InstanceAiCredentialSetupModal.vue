<script lang="ts" setup>
import { ref, computed } from 'vue';
import { N8nButton, N8nHeading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiCredentialRequest } from '@n8n/api-types';
import Modal from '@/app/components/Modal.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import IconSuccess from '@/features/workflows/templates/components/IconSuccess.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

export interface InstanceAiCredentialSetupModalData {
	credentialRequests: InstanceAiCredentialRequest[];
	message: string;
	projectId?: string;
	onComplete: (credentials: Record<string, string>) => void;
}

const props = defineProps<{
	modalName: string;
	data: InstanceAiCredentialSetupModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();

const selections = ref<Record<string, string | null>>(
	Object.fromEntries(props.data.credentialRequests.map((r) => [r.credentialType, null])),
);

const allSelected = computed(() =>
	props.data.credentialRequests.every((r) => selections.value[r.credentialType] !== null),
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
	props.data.onComplete(credentials);
	uiStore.closeModal(props.modalName);
}
</script>

<template>
	<Modal width="500px" max-height="80%" :name="props.modalName" :scrollable="true">
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{ i18n.baseText('instanceAi.credential.modal.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<div :class="$style.content">
				<ol :class="$style.credentialList">
					<li
						v-for="(req, index) in props.data.credentialRequests"
						:key="req.credentialType"
						:class="$style.credentialItem"
						data-test-id="instance-ai-credential-step"
					>
						<div :class="$style.stepHeader">
							<N8nHeading tag="h3" size="large">
								<span :class="$style.stepOrder">{{ index + 1 }}.</span>
								{{ getDisplayName(req.credentialType) }}
							</N8nHeading>
						</div>

						<p v-if="req.reason" :class="$style.reason">{{ req.reason }}</p>

						<div :class="$style.pickerRow">
							<CredentialPicker
								:class="$style.picker"
								:app-name="getDisplayName(req.credentialType)"
								:credential-type="req.credentialType"
								:selected-credential-id="selections[req.credentialType]"
								:project-id="props.data.projectId"
								:suggested-credential-name="req.suggestedName"
								@credential-selected="handleCredentialSelected(req.credentialType, $event)"
								@credential-deselected="handleCredentialDeselected(req.credentialType)"
							/>
							<IconSuccess
								:class="{
									[$style.successIcon]: true,
									[$style.invisible]: !selections[req.credentialType],
								}"
							/>
						</div>
					</li>
				</ol>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					size="large"
					:label="i18n.baseText('templateSetup.continue.button')"
					:disabled="!allSelected"
					data-test-id="instance-ai-credential-continue-button"
					@click="handleContinue"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	margin-top: var(--spacing--lg);
}

.credentialList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xl);
	margin-bottom: var(--spacing--lg);
	list-style: none;
	padding: 0;
}

.credentialItem:not(:last-of-type) {
	padding-bottom: var(--spacing--2xl);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
}

.stepHeader {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing--2xs);
}

.stepOrder {
	font-weight: var(--font-weight--bold);
	margin-right: var(--spacing--xs);
}

.reason {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--lg);
}

.pickerRow {
	max-width: 400px;
	display: flex;
	align-items: center;
}

.picker {
	flex: 1;
}

.successIcon {
	margin-left: var(--spacing--2xs);
	font-size: 24px;
}

.invisible {
	visibility: hidden;
}

.footer {
	display: flex;
	justify-content: flex-end;
}
</style>
