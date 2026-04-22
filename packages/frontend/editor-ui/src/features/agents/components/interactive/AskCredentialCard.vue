<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
	N8nButton,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { AskCredentialResume } from '@n8n/api-types';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';

const props = defineProps<{
	purpose: string;
	credentialTypes: string[];
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
const projectsStore = useProjectsStore();
const uiStore = useUIStore();

// ---------------------------------------------------------------------------
// Credential options — union of all credentials matching any accepted type
// ---------------------------------------------------------------------------

/** Display-name for each accepted credential type, falling back to the raw key. */
function typeDisplayName(typeName: string): string {
	return credentialsStore.getCredentialTypeByName(typeName)?.displayName ?? typeName;
}

/** Primary accepted type — used as the default target for "Create new". */
const primaryType = computed(() => props.credentialTypes[0] ?? '');

/** All credentials across all accepted types, deduplicated by id. */
const options = computed<ICredentialsResponse[]>(() => {
	const seen = new Set<string>();
	const results: ICredentialsResponse[] = [];
	for (const type of props.credentialTypes) {
		for (const cred of credentialsStore.allUsableCredentialsByType[type] ?? []) {
			if (!seen.has(cred.id)) {
				seen.add(cred.id);
				results.push(cred);
			}
		}
	}
	return results.sort((a, b) => a.name.localeCompare(b.name));
});

const hasOptions = computed(() => options.value.length > 0);

// ---------------------------------------------------------------------------
// Selection state
// ---------------------------------------------------------------------------

const selectedId = ref<string>('');
const filter = ref('');
// N8nSelect doesn't expose a public type; we only need `.blur()`.
const selectRef = ref<{ blur: () => void } | null>(null);

const selectedCredential = computed(
	() => options.value.find((c) => c.id === selectedId.value) ?? null,
);

function matches(needle: string, haystack: string) {
	return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

const canCreateCredentials = computed(
	() =>
		getResourcePermissions(
			projectsStore.currentProject?.scopes ?? projectsStore.personalProject?.scopes,
		).credential.create,
);

// ---------------------------------------------------------------------------
// Create new credential
// ---------------------------------------------------------------------------

/** The credential type we are currently listening for (after opening the modal). */
const subscribedType = ref('');

function openCreateModal(type = primaryType.value) {
	subscribedType.value = type;
	uiStore.openNewCredential(type, false, false, props.projectId);
}

/** When the credential store creates a new credential while we're subscribed,
 *  auto-select it and immediately emit submit. */
const stopListening = credentialsStore.$onAction(({ name, after }) => {
	if (name !== 'createNewCredential' || !subscribedType.value) return;
	after((result) => {
		const created = result as ICredentialsResponse | undefined;
		if (!created) return;
		subscribedType.value = '';
		selectedId.value = created.id;
		// Auto-confirm after creation — mirrors the NDV "create & select" UX.
		emit('submit', { credentialId: created.id, credentialName: created.name });
	});
});

onBeforeUnmount(() => {
	stopListening();
});

// ---------------------------------------------------------------------------
// Load credentials on mount
// ---------------------------------------------------------------------------

onMounted(async () => {
	await credentialsStore.fetchAllCredentials({ projectId: props.projectId });
	// Auto-select the most recently updated credential if only one type exists.
	if (options.value.length > 0 && !selectedId.value) {
		const latest = [...options.value].sort(
			(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		)[0];
		if (latest) selectedId.value = latest.id;
	}
});

// ---------------------------------------------------------------------------
// Submit / skip
// ---------------------------------------------------------------------------

function onSubmit() {
	if (props.disabled || !selectedCredential.value) return;
	emit('submit', {
		credentialId: selectedCredential.value.id,
		credentialName: selectedCredential.value.name,
	});
}

function onSkip() {
	if (props.disabled) return;
	emit('submit', { skipped: true });
}

function onClickCreateCredential() {
	selectRef.value?.blur();
	openCreateModal();
}
</script>

<template>
	<div :class="[$style.card, disabled && $style.disabled]" data-testid="ask-credential-card">
		<N8nText tag="p" bold :class="$style.purpose">{{ purpose }}</N8nText>

		<N8nInputLabel
			:label="
				credentialTypes.length === 1
					? i18n.baseText('nodeCredentials.credentialFor', {
							interpolate: { credentialType: typeDisplayName(credentialTypes[0]) },
						})
					: i18n.baseText('nodeCredentials.credentialsLabelShort')
			"
			:bold="false"
			size="small"
			color="text-dark"
		>
			<!-- Empty state: no credentials exist yet -->
			<div
				v-if="!hasOptions"
				:class="$style.emptyContainer"
				data-testid="ask-credential-empty-state"
			>
				<N8nSelect
					:class="$style.emptySelect"
					size="small"
					disabled
					:placeholder="i18n.baseText('nodeCredentials.emptyState.noCredentials')"
				/>
				<N8nButton
					v-if="canCreateCredentials && !disabled"
					variant="subtle"
					size="small"
					data-testid="ask-credential-setup-button"
					@click="openCreateModal()"
				>
					{{ i18n.baseText('nodeCredentials.emptyState.setupCredential') }}
				</N8nButton>
			</div>

			<!-- Normal state: credentials available -->
			<div v-else :class="$style.selectRow">
				<N8nSelect
					ref="selectRef"
					v-model="selectedId"
					size="small"
					filterable
					:filter-method="(v: string) => (filter = v)"
					:placeholder="i18n.baseText('nodeCredentials.selectCredential')"
					:disabled="disabled"
					:popper-class="$style.selectPopper"
					data-testid="ask-credential-select"
				>
					<N8nOption
						v-for="cred in options.filter((o) => matches(filter, o.name))"
						:key="cred.id"
						:label="cred.name"
						:value="cred.id"
						:data-testid="`ask-credential-option-${cred.id}`"
					>
						<div :class="$style.credentialOption">
							<N8nText bold>{{ cred.name }}</N8nText>
							<N8nText size="small">{{ typeDisplayName(cred.type) }}</N8nText>
						</div>
					</N8nOption>
					<template #empty />
					<template v-if="canCreateCredentials && !disabled" #footer>
						<button
							type="button"
							:class="$style.newCredential"
							data-testid="ask-credential-create-new"
							@click="onClickCreateCredential"
						>
							<N8nIcon size="xsmall" icon="plus" />
							{{ i18n.baseText('nodeCredentials.createNew') }}
						</button>
					</template>
				</N8nSelect>
			</div>
		</N8nInputLabel>

		<!-- Action row -->
		<div v-if="!disabled" :class="$style.actions">
			<N8nButton
				size="small"
				:disabled="!selectedCredential"
				data-testid="ask-credential-confirm"
				@click="onSubmit"
			>
				{{ i18n.baseText('nodeCredentials.selectCredential') }}
			</N8nButton>
			<N8nButton size="small" type="secondary" data-testid="ask-credential-skip" @click="onSkip">
				{{ i18n.baseText('generic.cancel') }}
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
</template>

<style lang="scss" module>
.card {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	background: var(--color--background);
	max-width: 420px;
}

.disabled {
	opacity: 0.7;
}

.purpose {
	margin: 0;
	font-size: var(--font-size--sm);
}

.emptyContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--4xs);
}

.emptySelect {
	flex: 1;
}

.selectRow {
	margin-top: var(--spacing--4xs);
}

.credentialOption {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) 0;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}

.resolvedRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--success);
}

// ---------- dropdown overrides (mirrors NodeCredentials) ----------

.selectPopper {
	:global(.el-select-dropdown__list) {
		padding: 0;
	}

	&:not(:has(li)) .newCredential {
		border-top: none;
		box-shadow: none;
		border-radius: var(--radius);
	}
}

.newCredential {
	display: flex;
	width: 100%;
	gap: var(--spacing--3xs);
	align-items: center;
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--color--background--light-2);
	color: var(--color--text--shade-1);
	border: 0;
	border-top: var(--border);
	box-shadow: var(--shadow--light);
	clip-path: inset(-12px 0 0 0);
	cursor: pointer;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
