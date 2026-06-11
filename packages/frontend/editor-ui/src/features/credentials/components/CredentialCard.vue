<script setup lang="ts">
import { computed, ref } from 'vue';
import dateformat from 'dateformat';
import { MODAL_CONFIRM } from '@/app/constants';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/features/collaboration/projects/projects.constants';
import { useDependencies } from '@/app/composables/useDependencies';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import CredentialIcon from './CredentialIcon.vue';
import { getResourcePermissions } from '@n8n/permissions';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '../credentials.store';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ProjectCardBadge from '@/features/collaboration/projects/components/ProjectCardBadge.vue';
import DependencyPill from '@/app/components/DependencyPill.vue';
import { useI18n } from '@n8n/i18n';
import { ResourceType } from '@/features/collaboration/projects/projects.utils';
import type { CredentialsResource } from '@/Interface';
import { useDynamicCredentials } from '@/features/resolvers/composables/useDynamicCredentials';
import { useCredentialOAuth } from '../composables/useCredentialOAuth';

import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nIcon,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const CREDENTIAL_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	DELETE: 'delete',
	MOVE: 'move',
	DISCONNECT: 'disconnect',
};

const emit = defineEmits<{
	click: [credentialId: string];
	connected: [credentialId: string];
}>();

const props = withDefaults(
	defineProps<{
		data: CredentialsResource;
		readOnly?: boolean;
		needsSetup?: boolean;
	}>(),
	{
		readOnly: false,
		needsSetup: false,
	},
);

const locale = useI18n();
const message = useMessage();
const toast = useToast();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const { isEnabled: isDynamicCredentialsEnabled } = useDynamicCredentials();
const { hasDependencies } = useDependencies();
const { authorize, isOAuthCredentialType } = useCredentialOAuth();

const isConnecting = ref(false);

const resourceTypeLabel = computed(() => locale.baseText('generic.credential').toLowerCase());
const credentialType = computed(() =>
	credentialsStore.getCredentialTypeByName(props.data.type ?? ''),
);
const credentialPermissions = computed(() => getResourcePermissions(props.data.scopes).credential);

const isPrivateUnconnected = computed(
	() =>
		isDynamicCredentialsEnabled.value &&
		props.data.isResolvable === true &&
		props.data.connectedByMe === false &&
		credentialPermissions.value.update === true,
);

const actions = computed(() => {
	const items = [
		{
			label: locale.baseText('credentials.item.open'),
			value: CREDENTIAL_LIST_ITEM_ACTIONS.OPEN,
		},
	];

	if (credentialPermissions.value.delete) {
		items.push({
			label: locale.baseText('credentials.item.delete'),
			value: CREDENTIAL_LIST_ITEM_ACTIONS.DELETE,
		});
	}

	if (credentialPermissions.value.move && projectsStore.isTeamProjectFeatureEnabled) {
		items.push({
			label: locale.baseText('credentials.item.move'),
			value: CREDENTIAL_LIST_ITEM_ACTIONS.MOVE,
		});
	}

	if (isDynamicCredentialsEnabled.value && props.data.isResolvable && props.data.connectedByMe) {
		items.push({
			label: locale.baseText('credentials.item.disconnect'),
			value: CREDENTIAL_LIST_ITEM_ACTIONS.DISCONNECT,
		});
	}

	return items;
});
const formattedCreatedAtDate = computed(() => {
	const currentYear = new Date().getFullYear().toString();

	return dateformat(
		props.data.createdAt,
		`d mmmm${String(props.data.createdAt).startsWith(currentYear) ? '' : ', yyyy'}`,
	);
});

const credentialHasDependents = computed(() => hasDependencies(props.data.id));

function onClick() {
	emit('click', props.data.id);
}

async function onConnect() {
	const credential = credentialsStore.getCredentialById(props.data.id);
	if (!credential) return;

	// Direct OAuth flow only applies to OAuth credential types. Fall back to
	// the edit modal for anything else — today only OAuth credentials can be
	// resolvable, but this keeps the button safe if that ever changes.
	if (!isOAuthCredentialType(credential.type)) {
		onClick();
		return;
	}

	isConnecting.value = true;
	try {
		const success = await authorize(credential);
		if (success) {
			emit('connected', props.data.id);
		}
	} finally {
		isConnecting.value = false;
	}
}

async function onAction(action: string) {
	switch (action) {
		case CREDENTIAL_LIST_ITEM_ACTIONS.OPEN:
			onClick();
			break;
		case CREDENTIAL_LIST_ITEM_ACTIONS.DELETE:
			await deleteResource();
			break;
		case CREDENTIAL_LIST_ITEM_ACTIONS.MOVE:
			moveResource();
			break;
		case CREDENTIAL_LIST_ITEM_ACTIONS.DISCONNECT:
			await disconnectResource();
			break;
	}
}

async function deleteResource() {
	const deleteConfirmed = await message.confirm(
		locale.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.message', {
			interpolate: { savedCredentialName: props.data.name },
		}),
		locale.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline'),
		{
			confirmButtonText: locale.baseText(
				'credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText',
			),
		},
	);

	if (deleteConfirmed === MODAL_CONFIRM) {
		await credentialsStore.deleteCredential({ id: props.data.id });
	}
}

async function disconnectResource() {
	const confirmed = await message.confirm(
		locale.baseText('credentialEdit.credentialEdit.confirmMessage.disconnectCredential.message', {
			interpolate: { savedCredentialName: props.data.name },
		}),
		locale.baseText('credentialEdit.credentialEdit.confirmMessage.disconnectCredential.headline'),
		{
			confirmButtonText: locale.baseText(
				'credentialEdit.credentialEdit.confirmMessage.disconnectCredential.confirmButtonText',
			),
		},
	);

	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await credentialsStore.disconnectMyConnection({ id: props.data.id });
		toast.showMessage({
			title: locale.baseText('credentialEdit.credentialEdit.showMessage.disconnected.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(
			error,
			locale.baseText('credentialEdit.credentialEdit.showError.disconnectCredential.title'),
		);
	}
}

function moveResource() {
	uiStore.openModalWithData({
		name: PROJECT_MOVE_RESOURCE_MODAL,
		data: {
			resource: props.data,
			resourceType: ResourceType.Credential,
			resourceTypeLabel: resourceTypeLabel.value,
		},
	});
}
</script>

<template>
	<N8nCard :class="$style.cardLink" @click.stop="onClick">
		<template #prepend>
			<CredentialIcon :credential-type-name="credentialType?.name ?? ''" />
		</template>
		<template #header>
			<N8nText tag="h2" bold :class="$style.cardHeading">
				{{ data.name }}
				<N8nBadge v-if="readOnly" class="ml-3xs" theme="tertiary" bold>
					{{ locale.baseText('credentials.item.readonly') }}
				</N8nBadge>
				<N8nBadge v-if="needsSetup" class="ml-3xs" theme="warning">
					{{ locale.baseText('credentials.item.needsSetup') }}
				</N8nBadge>
				<N8nTooltip v-if="isDynamicCredentialsEnabled && data.isResolvable" placement="top">
					<template #content>
						<div :class="$style.tooltipContent">
							<strong>{{ locale.baseText('credentials.private.tooltipTitle') }}</strong>
							<span>{{ locale.baseText('credentials.private.tooltip') }}</span>
						</div>
					</template>
					<N8nBadge
						theme="tertiary"
						class="ml-3xs pl-3xs pr-3xs"
						data-test-id="credential-card-dynamic"
					>
						<span :class="$style.dynamicBadgeText">
							<N8nIcon icon="key-round" size="small" />
							{{ locale.baseText('credentials.private.badge') }}
						</span>
					</N8nBadge>
				</N8nTooltip>
			</N8nText>
		</template>
		<div :class="$style.cardDescription">
			<N8nText color="text-light" size="small">
				<span v-if="credentialType">{{ credentialType.displayName }} | </span>
				<span v-show="data"
					>{{ locale.baseText('credentials.item.updated') }} <TimeAgo :date="data.updatedAt" /> |
				</span>
				<span v-show="data"
					>{{ locale.baseText('credentials.item.created') }} {{ formattedCreatedAtDate }}
				</span>
			</N8nText>
		</div>
		<template #append>
			<div :class="$style.cardActions" @click.stop>
				<DependencyPill
					v-if="credentialHasDependents"
					resource-type="credential"
					:resource-id="data.id"
					source="credential_card"
					data-test-id="credential-card-dependents"
				/>
				<ProjectCardBadge
					:class="$style.cardBadge"
					:resource="data"
					:resource-type="ResourceType.Credential"
					:resource-type-label="resourceTypeLabel"
					:personal-project="projectsStore.personalProject"
					:show-badge-border="false"
					:global="data.isGlobal"
				/>
				<N8nTooltip v-if="isPrivateUnconnected" placement="top">
					<template #content>
						{{ locale.baseText('credentials.item.connect.tooltip') }}
					</template>
					<N8nButton
						type="primary"
						size="mini"
						:loading="isConnecting"
						data-test-id="credential-card-connect"
						@click="onConnect"
					>
						{{ locale.baseText('credentials.item.connect') }}
					</N8nButton>
				</N8nTooltip>
				<N8nActionToggle
					data-test-id="credential-card-actions"
					:actions="actions"
					theme="dark"
					@action="onAction"
				/>
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.cardLink {
	--card--padding: 0 0 0 var(--spacing--sm);

	transition: box-shadow 0.3s ease;
	cursor: pointer;
	align-items: stretch;

	&:hover {
		box-shadow: var(--shadow--card-hover);
	}
}

.cardHeading {
	display: flex;
	align-items: center;
	font-size: var(--font-size--sm);
	padding: var(--spacing--sm) 0 0;
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing--sm);
}

.cardActions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing--sm) 0 0;
	cursor: default;
}

.dynamicBadgeText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	line-height: 1;
	vertical-align: middle;
}

.tooltipContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

@include mixins.breakpoint('sm-and-down') {
	.cardLink {
		--card--padding: 0 var(--spacing--sm) var(--spacing--sm);
		--card--append--width: 100%;

		flex-wrap: wrap;
	}

	.cardActions {
		width: 100%;
		padding: 0;
	}

	.cardBadge {
		margin-right: auto;
	}
}
</style>
