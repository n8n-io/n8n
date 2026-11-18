<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
	N8nTooltip,
	useMessage,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import SourceBadge from '@/features/projectSettingsPrototype/components/SourceBadge.vue';
import {
	CREDENTIAL_RESOLVERS,
	VAULT_PROVIDERS,
	vaultProviderById,
} from '@/features/projectSettingsPrototype/data/instance';
import { formatNumber } from '@/features/projectSettingsPrototype/data/time';
import type { Vault } from '@/features/projectSettingsPrototype/data/types';
import { resolveOverride, type Source } from '@/features/projectSettingsPrototype/state/resolve';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import {
	addProjectVault,
	projectState,
	removeProjectVault,
	setProjectResolver,
	store,
	vaultsFor,
} from '@/features/projectSettingsPrototype/state/store';

const props = defineProps<{ projectId: string }>();

const can = useCan();
const toast = useToast();
const message = useMessage();

const canEdit = computed(() => can('project:settings:edit'));

const count = (value: number, noun: string) =>
	`${formatNumber(value)} ${noun}${value === 1 ? '' : 's'}`;

/* ── Secrets vaults ───────────────────────────────────────────────────── */

const vaults = computed(() => vaultsFor(props.projectId));
const projectsAddVaults = computed(() => store.instance.allowProjects.vaults);
const canAddVault = computed(() => canEdit.value && projectsAddVaults.value);

const emptyDescription = computed(() =>
	canAddVault.value
		? "Add a vault to use its secrets in this project's credentials."
		: 'This project has no secrets vault to read from.',
);

const isOwn = (vault: Vault) => vault.scope === 'project';
const sourceOf = (vault: Vault): Source => (isOwn(vault) ? 'project' : 'locked');

function sharingNote(vault: Vault): string | undefined {
	if (vault.scope === 'everyone') return 'Shared with every project';
	if (vault.scope === 'shared') {
		return vault.projectIds.length === 1
			? 'Shared with this project only'
			: `Shared with ${count(vault.projectIds.length, 'project')}`;
	}
	return undefined;
}

function vaultDetails(vault: Vault): string {
	return [
		vaultProviderById(vault.provider).name,
		vault.secrets.length > 0 ? count(vault.secrets.length, 'secret') : 'No secrets yet',
		sharingNote(vault),
	]
		.filter((part) => part !== undefined)
		.join(' · ');
}

const usageLabel = (credentials: number) =>
	credentials === 0 ? 'Not used in a credential' : `Used in ${count(credentials, 'credential')}`;

async function onRemoveVault(vault: Vault) {
	const secretsInUse = vault.secrets.filter((secret) => secret.usedInCredentials > 0).length;
	if (secretsInUse > 0) {
		const answer = await message.confirm(
			`Credentials use ${count(secretsInUse, 'secret')} from ${vault.name}. They can't read ${
				secretsInUse === 1 ? 'it' : 'them'
			} after you remove the vault.`,
			'Remove vault?',
			{ confirmButtonText: 'Remove vault', cancelButtonText: 'Cancel' },
		);
		if (answer !== 'confirm') return;
	}
	removeProjectVault(props.projectId, vault.id);
	toast.showMessage({ title: 'Vault removed', type: 'success' });
}

/* ── Add vault ────────────────────────────────────────────────────────── */

const formId = useId();
const nameInputId = useId();
const nameHintId = useId();

const dialogOpen = ref(false);
const submitted = ref(false);
const form = reactive({ name: '', provider: '' });

const nameError = computed(() => {
	const name = form.name.trim();
	if (!name) return 'Enter a name to add the vault';
	if (!/^[a-zA-Z0-9]+$/.test(name)) return 'Use letters and digits only';
	const taken = vaults.value.find((vault) => vault.name.toLowerCase() === name.toLowerCase());
	if (taken) return `A vault named ${taken.name} already exists. Use a different name.`;
	return undefined;
});

/** A name that breaks a rule says so while it's typed. An empty one waits for the submit. */
const shownNameError = computed(() =>
	submitted.value || form.name.trim() ? nameError.value : undefined,
);
const shownProviderError = computed(() =>
	submitted.value && !form.provider ? 'Select a provider' : undefined,
);

function openAddVault() {
	form.name = '';
	form.provider = '';
	submitted.value = false;
	dialogOpen.value = true;
}

function onAddVault() {
	submitted.value = true;
	if (nameError.value || !form.provider) return;
	addProjectVault(props.projectId, { name: form.name.trim(), provider: form.provider });
	dialogOpen.value = false;
	toast.showMessage({ title: 'Vault added', type: 'success' });
}

/* ── Credential resolver ──────────────────────────────────────────────── */

const resolved = computed(() =>
	resolveOverride(
		store.instance.resolverId,
		projectState(props.projectId).resolverId,
		store.instance.allowProjects.resolver,
	),
);

const instanceResolverName = computed(
	() =>
		CREDENTIAL_RESOLVERS.find((resolver) => resolver.id === resolved.value.instanceValue)?.name ??
		resolved.value.instanceValue,
);

const resolverDisabled = computed(() => resolved.value.source === 'locked' || !canEdit.value);

function onResolverChange(resolverId: string) {
	if (resolverId === resolved.value.value) return;
	setProjectResolver(props.projectId, resolverId);
	toast.showMessage({ title: 'Credential resolver changed', type: 'success' });
}

function onResetResolver() {
	setProjectResolver(props.projectId, undefined);
	toast.showMessage({
		title: 'Credential resolver reset to the instance setting',
		type: 'success',
	});
}
</script>

<template>
	<div :class="$style.page" data-test-id="project-external-secrets-page">
		<N8nSettingsSection :class="$style.section" data-test-id="external-secrets-vaults-section">
			<template #title>
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h2" step="md" color="text-dark">Secrets vaults</N8nHeading>
					<N8nButton
						v-if="canAddVault"
						variant="outline"
						size="small"
						data-test-id="external-secrets-add-vault"
						@click="openAddVault"
					>
						<template #icon>
							<N8nIcon icon="plus" size="small" />
						</template>
						Add vault
					</N8nButton>
				</div>
			</template>
			<template #description>
				<N8nText
					v-if="projectsAddVaults"
					size="small"
					color="text-base"
					data-test-id="external-secrets-vaults-description"
				>
					A credential reads a secret with an expression:
					<code :class="$style.code">$secrets.vaultName.secretName</code>
				</N8nText>
				<N8nText
					v-else
					size="small"
					color="text-base"
					data-test-id="external-secrets-vaults-managed-note"
				>
					Instance admins manage vaults for every project.
					<RouterLink
						v-if="can('instance:settings:view')"
						to="/settings/external-secrets"
						:class="$style.link"
						data-test-id="external-secrets-instance-link"
					>
						Open instance external secrets
					</RouterLink>
				</N8nText>
			</template>

			<N8nSettingsRowGroup data-test-id="external-secrets-vault-list">
				<N8nSettingsRow
					v-if="vaults.length === 0"
					title="No vaults yet"
					:description="emptyDescription"
					data-test-id="external-secrets-vaults-empty"
				/>
				<N8nSettingsRow
					v-for="vault in vaults"
					:key="vault.id"
					:title="vault.name"
					:expandable="vault.secrets.length > 0"
					expand-label="Show secrets"
					collapse-label="Hide secrets"
					:action-max-width="false"
					data-test-id="external-secrets-vault"
				>
					<template #visual>
						<span :class="$style.providerTile">
							<img
								:class="$style.providerImage"
								:src="vaultProviderById(vault.provider).image"
								alt=""
							/>
						</span>
					</template>
					<template #info>
						<span :class="$style.rowTitle">
							<code :class="$style.vaultName" data-test-id="external-secrets-vault-name">
								{{ vault.name }}
							</code>
							<SourceBadge :source="sourceOf(vault)" />
						</span>
						<N8nText size="small" color="text-light">{{ vaultDetails(vault) }}</N8nText>
					</template>
					<template v-if="isOwn(vault) && canEdit" #action>
						<N8nTooltip content="Remove vault" placement="top">
							<N8nIconButton
								icon="trash-2"
								variant="ghost"
								size="small"
								:aria-label="`Remove vault ${vault.name}`"
								data-test-id="external-secrets-remove-vault"
								@click="onRemoveVault(vault)"
							/>
						</N8nTooltip>
					</template>
					<template #expanded>
						<ul :class="$style.secrets" data-test-id="external-secrets-vault-secrets">
							<li v-for="secret in vault.secrets" :key="secret.name" :class="$style.secret">
								<code :class="$style.secretName">{{ secret.name }}</code>
								<N8nText size="small" color="text-light">
									{{ usageLabel(secret.usedInCredentials) }}
								</N8nText>
							</li>
						</ul>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection
			title="Credential resolver"
			:class="$style.section"
			data-test-id="external-secrets-resolver-section"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow :action-max-width="false" data-test-id="external-secrets-resolver-row">
					<template #info>
						<span :class="$style.rowTitle">
							<N8nText bold color="text-dark">Resolver for this project</N8nText>
							<SourceBadge :source="resolved.source" />
						</span>
						<N8nText size="small" color="text-light">
							Matches the person who triggers a workflow to their own credentials
						</N8nText>
					</template>
					<template #action>
						<N8nSelect
							:class="$style.resolverSelect"
							:model-value="resolved.value"
							:disabled="resolverDisabled"
							size="medium"
							data-test-id="external-secrets-resolver-select"
							@update:model-value="onResolverChange"
						>
							<N8nOption
								v-for="resolver in CREDENTIAL_RESOLVERS"
								:key="resolver.id"
								:value="resolver.id"
								:label="resolver.name"
							>
								<span :class="$style.resolverOption">
									<span>{{ resolver.name }}</span>
									<span :class="$style.resolverType">{{ resolver.type }}</span>
								</span>
							</N8nOption>
						</N8nSelect>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>

			<div
				v-if="resolved.source === 'project'"
				:class="$style.reset"
				data-test-id="external-secrets-resolver-instance-note"
			>
				<N8nText size="small" color="text-light">
					The instance setting is {{ instanceResolverName }}.
				</N8nText>
				<N8nButton
					v-if="canEdit"
					variant="ghost"
					size="small"
					data-test-id="external-secrets-resolver-reset"
					@click="onResetResolver"
				>
					Reset to instance setting
				</N8nButton>
			</div>
		</N8nSettingsSection>

		<N8nDialog
			:open="dialogOpen"
			size="small"
			header="Add vault"
			data-test-id="external-secrets-add-vault-dialog"
			@update:open="dialogOpen = $event"
		>
			<N8nDialogBody>
				<form :id="formId" :class="$style.form" novalidate @submit.prevent="onAddVault">
					<div :class="$style.field">
						<N8nInputLabel label="Name" :input-name="nameInputId">
							<N8nInput
								:id="nameInputId"
								v-model="form.name"
								placeholder="awsStaging"
								autofocus
								:maxlength="64"
								:aria-invalid="shownNameError ? 'true' : undefined"
								:aria-describedby="nameHintId"
								data-test-id="external-secrets-vault-name-input"
							/>
						</N8nInputLabel>
						<N8nText
							v-if="shownNameError"
							:id="nameHintId"
							size="small"
							color="danger"
							role="alert"
							data-test-id="external-secrets-vault-name-error"
						>
							{{ shownNameError }}
						</N8nText>
						<N8nText v-else :id="nameHintId" size="small" color="text-light">
							Letters and digits only. Expressions use this name to reach the vault.
						</N8nText>
					</div>

					<div :class="$style.field">
						<N8nInputLabel label="Provider">
							<N8nSelect
								v-model="form.provider"
								placeholder="Select a provider"
								data-test-id="external-secrets-vault-provider-select"
							>
								<N8nOption
									v-for="provider in VAULT_PROVIDERS"
									:key="provider.id"
									:value="provider.id"
									:label="provider.name"
								>
									<span :class="$style.providerOption">
										<span :class="[$style.providerTile, $style.providerTileSmall]">
											<img :class="$style.providerImage" :src="provider.image" alt="" />
										</span>
										{{ provider.name }}
									</span>
								</N8nOption>
							</N8nSelect>
						</N8nInputLabel>
						<N8nText
							v-if="shownProviderError"
							size="small"
							color="danger"
							role="alert"
							data-test-id="external-secrets-vault-provider-error"
						>
							{{ shownProviderError }}
						</N8nText>
					</div>
				</form>
			</N8nDialogBody>
			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					data-test-id="external-secrets-add-vault-cancel"
					@click="dialogOpen = false"
				>
					Cancel
				</N8nButton>
				<N8nButton type="submit" :form="formId" data-test-id="external-secrets-add-vault-submit">
					Add vault
				</N8nButton>
			</N8nDialogFooter>
		</N8nDialog>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);

	// N8nSettingsSection adds its own margin between two sections. The page gap is the distance here.
	> .section + .section {
		margin-block-start: 0;
	}
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--height--sm);
}

.code,
.vaultName,
.secretName {
	font-family: var(--font-family--monospace);
}

.code {
	color: var(--text-color);
	font-size: var(--font-size--2xs);
}

.link {
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
	text-decoration: underline;
	text-underline-offset: var(--spacing--5xs);

	&:hover {
		color: var(--text-color--subtle);
	}

	&:focus-visible {
		border-radius: var(--radius--4xs);
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: var(--spacing--5xs);
	}
}

.rowTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.vaultName {
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	text-overflow: ellipsis;
	white-space: nowrap;
}

// Provider marks have fixed colors, so they sit on a light tile in both themes.
.providerTile {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background-color: var(--color--neutral-white);
}

.providerTileSmall {
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--3xs);
}

.providerImage {
	display: block;
	width: var(--spacing--md);
	height: var(--spacing--md);
	object-fit: contain;

	.providerTileSmall & {
		width: var(--spacing--sm);
		height: var(--spacing--sm);
	}
}

.secrets {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding-block: var(--spacing--2xs);
	padding-inline-end: var(--spacing--sm);
	// Lines the secrets up with the vault's name, past the provider image.
	padding-inline-start: calc(var(--spacing--sm) + var(--spacing--xl) + var(--spacing--2xs));
	list-style: none;
}

.secret {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-block: var(--spacing--4xs);
}

.secretName {
	min-width: 0;
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	overflow-wrap: anywhere;
}

.resolverSelect {
	width: var(--spacing--5xl);
}

.resolverOption {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.resolverType {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.reset {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-inline-start: var(--spacing--sm);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.providerOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
