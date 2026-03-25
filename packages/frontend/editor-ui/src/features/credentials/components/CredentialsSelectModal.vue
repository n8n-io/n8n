<script setup lang="ts">
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useCredentialsStore } from '../credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onMounted, ref } from 'vue';
import { CREDENTIAL_SELECT_MODAL_KEY } from '../credentials.constants';
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';

import { N8nButton, N8nIcon, N8nOption, N8nSelect } from '@n8n/design-system';
import { useCredentialSetupRecipeStore } from '@/experiments/credentialsSetup/stores/credentialSetupRecipe.store';
import { BADGE_LABELS, FRICTION_SORT_ORDER } from '@/experiments/credentialsSetup/constants';

const externalHooks = useExternalHooks();
const telemetry = useTelemetry();
const i18n = useI18n();

const modalBus = ref(createEventBus());
const selected = ref('');
const loading = ref(true);
const selectRef = ref<HTMLSelectElement>();

const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const recipeStore = useCredentialSetupRecipeStore();

onMounted(async () => {
	try {
		await credentialsStore.fetchCredentialTypes(false);
	} catch (e) {}

	loading.value = false;

	setTimeout(() => {
		if (selectRef.value) {
			selectRef.value.focus();
		}
	}, 0);
});

// Exclude purpose built credentials for ChatHub
const selectableCredentialTypes = computed(() => {
	const types = credentialsStore.allCredentialTypes.filter((c) => !c.name.startsWith('chatHub'));

	// When experiment is enabled, sort recipe-active types to top by friction level
	if (recipeStore.isExperimentEnabled) {
		return [...types].sort((a, b) => {
			const aActive = recipeStore.isRecipeActive(a.name, 'badges');
			const bActive = recipeStore.isRecipeActive(b.name, 'badges');
			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;
			if (aActive && bActive) {
				const aFriction = recipeStore.getRecipeActivation(a.name).resolved.recipe.friction;
				const bFriction = recipeStore.getRecipeActivation(b.name).resolved.recipe.friction;
				const aOrder = FRICTION_SORT_ORDER.indexOf(aFriction);
				const bOrder = FRICTION_SORT_ORDER.indexOf(bFriction);
				if (aOrder !== bOrder) return aOrder - bOrder;
			}
			return a.displayName.localeCompare(b.displayName);
		});
	}

	return types;
});

function onSelect(type: string) {
	selected.value = type;
}

function openCredentialType() {
	modalBus.value.emit('close');
	uiStore.openNewCredential(selected.value);

	const telemetryPayload = {
		credential_type: selected.value,
		source: 'primary_menu',
		new_credential: true,
		workflow_id: workflowsStore.workflowId,
	};

	telemetry.track('User opened Credential modal', telemetryPayload);
	void externalHooks.run('credentialsSelectModal.openCredentialType', telemetryPayload);
}

function getRecipeBadge(credentialTypeName: string): string | undefined {
	if (!recipeStore.isRecipeActive(credentialTypeName, 'badges')) return undefined;
	const { recipe } = recipeStore.getRecipeActivation(credentialTypeName).resolved;
	return recipe.badgeLabel ?? BADGE_LABELS[recipe.friction];
}
</script>

<template>
	<Modal
		:name="CREDENTIAL_SELECT_MODAL_KEY"
		:event-bus="modalBus"
		width="50%"
		:center="true"
		:loading="loading"
		max-width="460px"
		min-height="250px"
	>
		<template #header>
			<h2 :class="$style.title">
				{{ i18n.baseText('credentialSelectModal.addNewCredential') }}
			</h2>
		</template>
		<template #content>
			<div>
				<div :class="$style.subtitle">
					{{ i18n.baseText('credentialSelectModal.selectAnAppOrServiceToConnectTo') }}
				</div>
				<N8nSelect
					ref="selectRef"
					filterable
					default-first-option
					:placeholder="i18n.baseText('credentialSelectModal.searchForApp')"
					size="xlarge"
					:model-value="selected"
					data-test-id="new-credential-type-select"
					@update:model-value="onSelect"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
					<N8nOption
						v-for="credential in selectableCredentialTypes"
						:key="credential.name"
						:value="credential.name"
						:label="credential.displayName"
						filterable
						data-test-id="new-credential-type-select-option"
					>
						{{ credential.displayName }}
						<span
							v-if="getRecipeBadge(credential.name)"
							:class="$style.frictionBadge"
							data-test-id="credential-friction-badge"
						>
							{{ getRecipeBadge(credential.name) }}
						</span>
					</N8nOption>
				</N8nSelect>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					:label="i18n.baseText('credentialSelectModal.continue')"
					float="right"
					size="large"
					:disabled="!selected"
					data-test-id="new-credential-type-button"
					@click="openCredentialType"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.title {
	font-size: var(--font-size--xl);
	line-height: var(--line-height--md);
}

.subtitle {
	margin-bottom: var(--spacing--sm);
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
}

.frictionBadge {
	display: inline-block;
	margin-left: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	font-size: var(--font-size--3xs);
	color: var(--color--success);
	background-color: var(--color--success--tint-4);
	border-radius: var(--radius--sm);
	white-space: nowrap;
}
</style>
