<script setup lang="ts">
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useCredentialsStore } from '../credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onMounted, ref, watch } from 'vue';
import { CREDENTIAL_SELECT_MODAL_KEY } from '../credentials.constants';
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import type { NewCredentialsModal } from '@/Interface';

import { N8nButton, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useInstanceAiCredentialHelp } from '@/features/ai/instanceAi/composables/useInstanceAiCredentialHelp';
import {
	ContactAdminModal,
	getCredentialTypeRestriction,
	SCOPE_LABEL_KEY,
	useTypeAvailabilityPoliciesStore,
	type RestrictedTypeKind,
	type TypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';
import type { ICredentialType } from 'n8n-workflow';
import CredentialTypeRestrictedMarker from './CredentialTypeRestrictedMarker.vue';
import { useContactAdminDialog } from '../composables/useContactAdminDialog';
import { useCredentialTypeUsability } from '../composables/useCredentialTypeUsability';
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
const typeAvailabilityPoliciesStore = useTypeAvailabilityPoliciesStore();
const { getCredentialTypeUsability } = useCredentialTypeUsability();

const {
	isOpen: isContactAdminOpen,
	state: contactAdmin,
	request: requestContactAdmin,
} = useContactAdminDialog(() => selectRef.value?.blur());
// The select mounts every option while closed, so the row popovers mount on the first open only.
const hasListOpened = ref(false);

const searchQuery = ref('');

const presetUsageScope = computed<NewCredentialsModal['usageScope']>(() => {
	const data = uiStore.modalsById[CREDENTIAL_SELECT_MODAL_KEY]?.data;
	return data?.usageScope === 'instance' ? 'instance' : undefined;
});

// The page loads the policy of its project. Until it loads, the store reports every type as available.
const isListLoading = computed(() => loading.value || typeAvailabilityPoliciesStore.isLoading);

onMounted(async () => {
	try {
		await credentialsStore.fetchCredentialTypes(false);
	} catch (e) {}

	loading.value = false;
});

// The select renders only once the list loads, so it takes the focus then.
watch(isListLoading, (isLoading) => {
	if (isLoading) return;

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

type RestrictedRow = {
	/** A blocked type cannot be selected. A type whose nodes are blocked still can. */
	blocked: boolean;
	kind: RestrictedTypeKind;
	restriction: TypeRestriction;
	scopeLabel: string;
	/** The popover derives its own copy for a blocked type. */
	popoverScopeLabel?: string;
	description?: string;
	contactSubject: string;
};

type CredentialTypeOption = { type: ICredentialType; restricted: RestrictedRow | null };

function toOption(type: ICredentialType): CredentialTypeOption {
	const usability = getCredentialTypeUsability(type.name);
	if (!usability) return { type, restricted: null };

	if (usability.reason === 'typeRestricted') {
		const { scope } = usability.restriction;
		return {
			type,
			restricted: {
				blocked: true,
				kind: 'credential',
				restriction: usability.restriction,
				scopeLabel: i18n.baseText(
					scope ? SCOPE_LABEL_KEY[scope] : 'typeAvailabilityPolicies.restrictedNodes.scope.generic',
				),
				contactSubject: type.displayName,
			},
		};
	}

	const scopeLabel = i18n.baseText(
		'typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.scope',
	);
	return {
		type,
		restricted: {
			blocked: false,
			kind: 'node',
			restriction: usability.restriction,
			scopeLabel,
			popoverScopeLabel: scopeLabel,
			description: i18n.baseText(
				'typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.description',
				{ interpolate: { nodeTypes: usability.nodeTypeNames.join(', ') } },
			),
			contactSubject: usability.nodeTypeNames.join(', '),
		},
	};
}

const optionRank = (option: CredentialTypeOption) =>
	!option.restricted ? 0 : option.restricted.blocked ? 1 : 2;

/**
 * Usable types first, then the types a policy blocks, then the types whose nodes it blocks.
 * The sort is stable and the store sorts the types by name, so each group keeps that order.
 * It does not depend on the search, so typing only filters.
 */
const credentialTypeOptions = computed(() =>
	allSelectableCredentialTypes.value
		.map(toOption)
		.toSorted((a, b) => optionRank(a) - optionRank(b)),
);

const selectableCredentialTypes = computed(() => {
	const q = searchQuery.value.toLowerCase();
	if (!q) return credentialTypeOptions.value;

	return credentialTypeOptions.value.filter(({ type }) =>
		type.displayName.toLowerCase().includes(q),
	);
});

function filterCredentials(query: string) {
	searchQuery.value = query;
}

function onSelect(type: string) {
	// Enter still selects a highlighted row that became restricted after the list opened.
	if (getCredentialTypeRestriction(type)) return;
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
		:loading="isListLoading"
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
						v-for="{ type: credential, restricted } in selectableCredentialTypes"
						:key="credential.name"
						:value="credential.name"
						:label="credential.displayName"
						:disabled="restricted?.blocked"
						filterable
						data-test-id="new-credential-type-select-option"
						@mousedown="(event: MouseEvent) => restricted?.blocked && event.preventDefault()"
					>
						<div v-if="restricted" :class="$style.restrictedOption">
							<span :class="$style.restrictedName">{{ credential.displayName }}</span>
							<span :class="$style.restrictedScope">
								<N8nText size="small" color="text-light">{{ restricted.scopeLabel }}</N8nText>
								<CredentialTypeRestrictedMarker
									v-if="hasListOpened"
									:name="credential.displayName"
									:restriction="restricted.restriction"
									:kind="restricted.kind"
									:scope-label="restricted.popoverScopeLabel"
									:description="restricted.description"
									@contact-admin="
										(audience) =>
											requestContactAdmin(restricted.contactSubject, audience, restricted.kind)
									"
								/>
							</span>
						</div>
					</N8nOption>
				</N8nSelect>
				<ContactAdminModal
					v-model:open="isContactAdminOpen"
					:kind="contactAdmin.kind"
					:type-name="contactAdmin.subject"
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
					:disabled="!selected || !!getCredentialTypeRestriction(selected)"
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
