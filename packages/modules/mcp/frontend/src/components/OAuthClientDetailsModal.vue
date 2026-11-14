<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
	OAUTH_CLIENT_DESCRIPTION_MAX_LENGTH,
	OAUTH_CLIENT_NAME_MAX_LENGTH,
	type OAuthClientResponseDto,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nInput,
	N8nText,
	N8nTimeAgo,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getClientBrand, scopeLabel } from '../clients.utils';
import { useMCPStore } from '../mcp.store';

const props = withDefaults(
	defineProps<{
		client: OAuthClientResponseDto | null;
		open: boolean;
		/** Refetch the clients page's list after a save. The overview passes `false`. */
		refreshList?: boolean;
	}>(),
	{ refreshList: true },
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	revoke: [client: OAuthClientResponseDto];
	/** The name or description was saved. Carries the row with the saved values. */
	updated: [client: OAuthClientResponseDto];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const rbacStore = useRBACStore();
const mcpStore = useMCPStore();

// The registration is shared by every user connected through it, so only managers edit it.
const canEdit = computed(() => rbacStore.hasScope('mcp:manage'));

const nameDraft = ref('');
const descriptionDraft = ref('');
const saving = ref(false);

function resetDrafts() {
	nameDraft.value = props.client?.name ?? '';
	descriptionDraft.value = props.client?.description ?? '';
}

watch(
	[() => props.open, () => props.client],
	([open]) => {
		if (open) resetDrafts();
	},
	{ immediate: true },
);

const trimmedName = computed(() => nameDraft.value.trim());
const trimmedDescription = computed(() => descriptionDraft.value.trim());
const nameChanged = computed(() => !!props.client && trimmedName.value !== props.client.name);
const descriptionChanged = computed(
	() => !!props.client && trimmedDescription.value !== (props.client.description ?? ''),
);
const canSave = computed(
	() => trimmedName.value.length > 0 && (nameChanged.value || descriptionChanged.value),
);

// A row is one consent (client × owner), so the owner is part of its identity.
function isSameRow(a: OAuthClientResponseDto | null, b: OAuthClientResponseDto) {
	return a?.id === b.id && a.owner?.id === b.owner?.id;
}

async function onSave() {
	const client = props.client;
	if (!client || !canSave.value || saving.value) return;

	try {
		saving.value = true;
		const updated = await mcpStore.updateOAuthClientDetails(
			client,
			{
				...(nameChanged.value ? { name: trimmedName.value } : {}),
				...(descriptionChanged.value ? { description: trimmedDescription.value || null } : {}),
			},
			{ refreshList: props.refreshList },
		);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.mcp.oAuthClients.details.save.success'),
		});
		// The modal can show another client by now, if it was closed and reopened during the save.
		if (isSameRow(props.client, client)) emit('updated', updated);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.oAuthClients.details.save.error'));
	} finally {
		saving.value = false;
	}
}

const brand = computed(() => (props.client ? getClientBrand(props.client.name) : null));

const ownerLabel = computed(() => {
	const owner = props.client?.owner;
	if (!owner) return null;
	const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ');
	return name ? `${name} (${owner.email})` : owner.email;
});

const subtitle = computed(() => {
	const type = brand.value?.type;
	if (!type) return i18n.baseText('settings.mcp.oAuthClients.details.subtitle');
	return i18n.baseText('settings.mcp.oAuthClients.details.subtitleWithType', {
		interpolate: {
			type: i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}` as BaseTextKey),
		},
	});
});

/** Granted scopes as human labels, listed plainly in grant order. */
const grantedScopes = computed(() => props.client?.scopes ?? []);

function onRevoke() {
	if (!props.client) return;
	emit('revoke', props.client);
	emit('update:open', false);
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		data-test-id="mcp-client-details-modal"
		@update:open="emit('update:open', $event)"
	>
		<template v-if="client">
			<N8nDialogHeader>
				<N8nDialogTitle>
					<span :class="$style.title">
						<span :class="$style['icon-chip']">
							<component :is="brand.icon" v-if="brand?.icon" :class="$style.icon" />
							<N8nIcon v-else icon="mcp" :class="$style.icon" />
						</span>
						{{ client.name }}
					</span>
				</N8nDialogTitle>
				<N8nDialogDescription>{{ subtitle }}</N8nDialogDescription>
			</N8nDialogHeader>

			<N8nDialogBody>
				<div :class="$style.details">
					<template v-if="canEdit">
						<N8nText
							tag="label"
							for="mcp-client-details-name"
							color="text-light"
							size="small"
							:class="$style['field-label']"
						>
							{{ i18n.baseText('settings.mcp.oAuthClients.details.name') }}
						</N8nText>
						<N8nInput
							id="mcp-client-details-name"
							v-model="nameDraft"
							size="small"
							:maxlength="OAUTH_CLIENT_NAME_MAX_LENGTH"
							data-test-id="mcp-client-details-name-input"
							@keydown.enter="onSave"
						/>

						<N8nText
							tag="label"
							for="mcp-client-details-description"
							color="text-light"
							size="small"
							:class="$style['field-label']"
						>
							{{ i18n.baseText('settings.mcp.oAuthClients.details.description') }}
						</N8nText>
						<N8nInput
							id="mcp-client-details-description"
							v-model="descriptionDraft"
							type="textarea"
							size="small"
							:autosize="{ minRows: 2, maxRows: 6 }"
							:maxlength="OAUTH_CLIENT_DESCRIPTION_MAX_LENGTH"
							:placeholder="
								i18n.baseText('settings.mcp.oAuthClients.details.description.placeholder')
							"
							data-test-id="mcp-client-details-description-input"
						/>
					</template>
					<template v-else-if="client.description">
						<N8nText color="text-light" size="small">
							{{ i18n.baseText('settings.mcp.oAuthClients.details.description') }}
						</N8nText>
						<N8nText
							color="text-dark"
							size="small"
							:class="$style.description"
							data-test-id="mcp-client-details-description"
						>
							{{ client.description }}
						</N8nText>
					</template>

					<template v-if="ownerLabel">
						<N8nText color="text-light" size="small">
							{{ i18n.baseText('settings.mcp.oAuthClients.details.connectedBy') }}
						</N8nText>
						<N8nText color="text-dark" size="small" data-test-id="mcp-client-details-connected-by">
							{{ ownerLabel }}
						</N8nText>
					</template>

					<N8nText color="text-light" size="small">
						{{ i18n.baseText('settings.mcp.oAuthClients.details.connectedOn') }}
					</N8nText>
					<N8nText color="text-dark" size="small" data-test-id="mcp-client-details-connected-on">
						<N8nTimeAgo
							:date="new Date(client.grantedAt).toISOString()"
							capitalize
							:locale="rootStore.defaultLocale"
						/>
					</N8nText>

					<N8nText color="text-light" size="small">
						{{ i18n.baseText('settings.mcp.oAuthClients.details.access') }}
					</N8nText>
					<div :class="$style.access" data-test-id="mcp-client-details-access">
						<N8nText
							v-for="scope in grantedScopes"
							:key="scope"
							color="text-dark"
							size="small"
							:data-test-id="`mcp-client-details-scope-${scope}`"
						>
							{{ scopeLabel(i18n, scope) }}
						</N8nText>
					</div>
				</div>
			</N8nDialogBody>

			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					data-test-id="mcp-client-details-close"
					@click="emit('update:open', false)"
				>
					{{ i18n.baseText('generic.close') }}
				</N8nButton>
				<N8nButton variant="destructive" data-test-id="mcp-client-details-revoke" @click="onRevoke">
					{{ i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccess') }}
				</N8nButton>
				<N8nButton
					v-if="canEdit"
					:disabled="!canSave"
					:loading="saving"
					data-test-id="mcp-client-details-save"
					@click="onSave"
				>
					{{ i18n.baseText('generic.save') }}
				</N8nButton>
			</N8nDialogFooter>
		</template>
	</N8nDialog>
</template>

<style lang="scss" module>
.title {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	flex-shrink: 0;
	/* fixed white tile so dark brand marks stay visible on the dark theme */
	background-color: var(--color--neutral-white);
	border: var(--border);
	border-radius: var(--radius);
}

.icon {
	width: var(--spacing--md);
	height: var(--spacing--md);
	/* the tile is always white, so the fallback MCP glyph must stay dark in both themes */
	color: var(--color--neutral-black);
}

.details {
	display: grid;
	grid-template-columns: minmax(120px, auto) 1fr;
	column-gap: var(--spacing--lg);
	row-gap: var(--spacing--xs);
	align-items: start;
	max-height: 60vh;
	overflow-y: auto;
}

.access {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

/* Center the label on the first line of its input. */
.field-label {
	padding-top: var(--spacing--3xs);
}

.description {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
