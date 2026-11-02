<script setup lang="ts">
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useCredentialsStore } from '../credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { CREDENTIAL_SELECT_MODAL_KEY } from '../credentials.constants';
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import type { NewCredentialsModal } from '@/Interface';

import { N8nButton, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useInstanceAiCredentialHelp } from '@/features/ai/instanceAi/composables/useInstanceAiCredentialHelp';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	ContactAdminModal,
	SCOPE_LABEL_KEY,
	useTypeAvailabilityPoliciesStore,
	type ContactAudience,
	type RestrictedTypeKind,
} from '@n8n/frontend-module-type-availability-policies';
import type { ICredentialType } from 'n8n-workflow';
import CredentialTypeRestrictedMarker from './CredentialTypeRestrictedMarker.vue';
import {
	useCredentialTypeUsability,
	type CredentialTypeUsability,
} from '../composables/useCredentialTypeUsability';
const externalHooks = useExternalHooks();
const telemetry = useTelemetry();
const i18n = useI18n();

const modalBus = ref(createEventBus());
const selected = ref('');
const loading = ref(true);
const selectRef = ref<HTMLSelectElement>();

const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const instanceAiCredentialHelp = useInstanceAiCredentialHelp();
const projectsStore = useProjectsStore();
const typeAvailabilityPoliciesStore = useTypeAvailabilityPoliciesStore();
const { getCredentialTypeUsability } = useCredentialTypeUsability();

const isContactAdminOpen = ref(false);
// The dialog keeps showing this copy while it fades out, so it stays set after the close.
const contactAdmin = ref<{ subject: string; kind: RestrictedTypeKind; audience: ContactAudience }>({
	subject: '',
	kind: 'credential',
	audience: 'instance',
});
// The select mounts every option while closed, so the row popovers mount on the first open only.
const hasListOpened = ref(false);

const searchQuery = ref('');

const presetUsageScope = computed<NewCredentialsModal['usageScope']>(() => {
	const data = uiStore.modalsById[CREDENTIAL_SELECT_MODAL_KEY]?.data;
	return data?.usageScope === 'instance' ? 'instance' : undefined;
});

// The new credential goes to this project, so its policy decides which types are usable.
const targetProjectId = projectsStore.currentProject?.id ?? projectsStore.personalProject?.id;
const projectBehindModal = typeAvailabilityPoliciesStore.loadedProjectId;
// Until it loads, the store reports every type as available, so the list waits for it.
const policyLoad = targetProjectId
	? typeAvailabilityPoliciesStore.fetchForProject(targetProjectId).catch(() => {})
	: Promise.resolve();

onBeforeUnmount(() => {
	if (projectBehindModal && projectBehindModal !== targetProjectId) {
		void typeAvailabilityPoliciesStore.fetchForProject(projectBehindModal);
	}
});

onMounted(async () => {
	try {
		await credentialsStore.fetchCredentialTypes(false);
	} catch (e) {}
	await policyLoad;

	loading.value = false;

	setTimeout(() => {
		if (selectRef.value) {
			selectRef.value.focus();
		}
	}, 0);
});

// Exclude hidden and purpose-built credentials for ChatHub
const allSelectableCredentialTypes = computed(() =>
	credentialsStore.allCredentialTypes.filter(
		(credentialType) => !credentialType.hidden && !credentialType.name.startsWith('chatHub'),
	),
);

type CredentialTypeOption = {
	type: ICredentialType;
	usability: CredentialTypeUsability | null;
};

/**
 * Usable types first, then the types a policy blocks, then the types whose nodes it blocks.
 * The store sorts the types by name, so each group keeps that order.
 */
const selectableCredentialTypes = computed(() => {
	const q = searchQuery.value.toLowerCase();
	const options: CredentialTypeOption[] = allSelectableCredentialTypes.value
		.filter((type) => !q || type.displayName.toLowerCase().includes(q))
		.map((type) => ({ type, usability: getCredentialTypeUsability(type.name) }));

	return [
		...options.filter((option) => !option.usability),
		...options.filter((option) => option.usability?.reason === 'typeRestricted'),
		...options.filter((option) => option.usability?.reason === 'nodesRestricted'),
	];
});

function isTypeRestricted(type: string): boolean {
	return getCredentialTypeUsability(type)?.reason === 'typeRestricted';
}

function scopeLabel(usability: CredentialTypeUsability): string {
	if (usability.reason === 'nodesRestricted') {
		return i18n.baseText('typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.scope');
	}

	return i18n.baseText(
		usability.restriction.scope
			? SCOPE_LABEL_KEY[usability.restriction.scope]
			: 'typeAvailabilityPolicies.restrictedNodes.scope.generic',
	);
}

function nodesDescription(usability: CredentialTypeUsability): string | undefined {
	if (usability.reason !== 'nodesRestricted') return undefined;

	return i18n.baseText(
		'typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.description',
		{
			interpolate: { nodeTypes: usability.nodeTypeNames.join(', ') },
		},
	);
}

function requestContactAdmin(
	type: ICredentialType,
	usability: CredentialTypeUsability,
	audience: ContactAudience,
) {
	// The dialog opens on top of the page, so the list must not stay open behind it.
	selectRef.value?.blur();
	contactAdmin.value =
		usability.reason === 'nodesRestricted'
			? { subject: usability.nodeTypeNames.join(', '), kind: 'node', audience }
			: { subject: type.displayName, kind: 'credential', audience };
	isContactAdminOpen.value = true;
}

function filterCredentials(query: string) {
	searchQuery.value = query;
}

function onSelect(type: string) {
	// Enter still selects a highlighted row that became restricted after the list opened.
	if (isTypeRestricted(type)) return;
	selected.value = type;
}

function openCredentialType() {
	modalBus.value.emit('close');
	// Carry the credentials-list credential help into the new-credential dialog so
	// it offers the Instance AI button (not the legacy assistant) like the rest of
	// the list does.
	uiStore.openNewCredential(
		selected.value,
		false,
		false,
		undefined,
		undefined,
		undefined,
		undefined,
		{
			instanceAiCredentialHelp: instanceAiCredentialHelp(),
			usageScope: presetUsageScope.value,
		},
	);

	const telemetryPayload = {
		credential_type: selected.value,
		source: 'primary_menu',
		new_credential: true,
		workflow_id: workflowDocumentStore.value.workflowId,
	};

	telemetry.track('User opened Credential modal', telemetryPayload);
	void externalHooks.run('credentialsSelectModal.openCredentialType', telemetryPayload);
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
					:filter-method="filterCredentials"
					data-test-id="new-credential-type-select"
					@update:model-value="onSelect"
					@visible-change="(visible: boolean) => visible && (hasListOpened = true)"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
					<!-- A press on a disabled row would move the focus out of the search input, so typing would stop filtering. -->
					<N8nOption
						v-for="{ type: credential, usability } in selectableCredentialTypes"
						:key="credential.name"
						:value="credential.name"
						:label="credential.displayName"
						:disabled="usability?.reason === 'typeRestricted'"
						filterable
						data-test-id="new-credential-type-select-option"
						:data-restriction="usability?.reason"
						@mousedown="
							(event: MouseEvent) =>
								usability?.reason === 'typeRestricted' && event.preventDefault()
						"
					>
						<div v-if="usability" :class="$style.restrictedOption">
							<span :class="$style.restrictedName">{{ credential.displayName }}</span>
							<span :class="$style.restrictedScope">
								<N8nText size="small" color="text-light">{{ scopeLabel(usability) }}</N8nText>
								<CredentialTypeRestrictedMarker
									v-if="hasListOpened"
									:name="credential.displayName"
									:restriction="usability.restriction"
									:kind="usability.reason === 'nodesRestricted' ? 'node' : 'credential'"
									:scope-label="
										usability.reason === 'nodesRestricted' ? scopeLabel(usability) : undefined
									"
									:description="nodesDescription(usability)"
									@contact-admin="
										(audience) => requestContactAdmin(credential, usability, audience)
									"
								/>
							</span>
						</div>
					</N8nOption>
				</N8nSelect>
				<ContactAdminModal
					v-model:open="isContactAdminOpen"
					:kind="contactAdmin.kind"
					:node-type-name="contactAdmin.subject"
					:audience="contactAdmin.audience"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					:label="i18n.baseText('credentialSelectModal.continue')"
					float="right"
					size="large"
					:disabled="!selected || isTypeRestricted(selected)"
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

.restrictedOption {
	display: flex;
	align-items: center;
	width: 100%;
	min-width: 0;
}

.restrictedName {
	flex: 1;
	// A zero width keeps a long name from widening the list. The popover title shows the full name.
	width: 0;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	// The global disabled option color is too faint to read next to the scope label.
	color: var(--text-color--disabled);
}

.restrictedScope {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
	gap: var(--spacing--4xs);
	padding-left: var(--spacing--sm);
	white-space: nowrap;
}
</style>
