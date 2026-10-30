<script setup lang="ts">
import { useCredentialDescriptionsExperiment } from '@/experiments/credentialDescriptions/useCredentialDescriptionsExperiment';
import { computed, ref } from 'vue';
import dateformat from 'dateformat';
import { MODAL_CONFIRM } from '@/app/constants';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/features/collaboration/projects/projects.constants';
import { useDependencies } from '@/app/composables/useDependencies';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import CredentialIcon from './CredentialIcon.vue';
import { getResourcePermissions } from '@n8n/permissions';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '../credentials.store';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ResourceListRow from '@/app/components/layouts/ResourceListRow.vue';
import ProjectCardBadge from '@/features/collaboration/projects/components/ProjectCardBadge.vue';
import DependencyPill from '@/app/components/DependencyPill.vue';
import { useI18n } from '@n8n/i18n';
import { ResourceType } from '@/features/collaboration/projects/projects.utils';
import type { CredentialsResource } from '@/Interface';
import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';
import PrivateCredentialIcon from '@/features/resolvers/components/PrivateCredentialIcon.vue';
import { useCredentialOAuth } from '../composables/useCredentialOAuth';

import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const { isEnabled: credentialDescriptionsEnabled } = useCredentialDescriptionsExperiment();

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
const { isEnabled: isPrivateCredentialsEnabled } = usePrivateCredentials();
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
		isPrivateCredentialsEnabled.value &&
		props.data.isResolvable === true &&
		props.data.connectedByMe === false &&
		credentialPermissions.value.connect === true,
);

const actions = computed(() => {
	const items = [
		{
			label: locale.baseText('credentials.item.open'),
			value: CREDENTIAL_LIST_ITEM_ACTIONS.OPEN,
		},
	];

	// Deleting an end-user credential removes every user's own connection,
	// so it additionally requires the createEndUser permission.
	if (
		credentialPermissions.value.delete &&
		(!props.data.isResolvable || credentialPermissions.value.createEndUser)
	) {
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

	if (isPrivateCredentialsEnabled.value && props.data.isResolvable && props.data.connectedByMe) {
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

const credentialHasDependents = computed(() => hasDependencies(props.data.id, 'credential'));

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
	<N8nCard @click.stop="onClick">
		<ResourceListRow>
			<template #name>
				<CredentialIcon :credential-type-name="credentialType?.name ?? ''" :size="16" />
				<div :class="$style.nameBlock">
					<div :class="$style.nameLine">
						<N8nText tag="h2" bold :class="$style.cardHeading">
							{{ data.name }}
						</N8nText>
						<N8nBadge v-if="readOnly" variant="outline">
							{{ locale.baseText('credentials.item.readonly') }}
						</N8nBadge>
						<N8nBadge v-if="needsSetup" variant="warning">
							{{ locale.baseText('credentials.item.needsSetup') }}
						</N8nBadge>
						<span
							v-if="isPrivateCredentialsEnabled && data.isResolvable"
							:class="$style.indicator"
							data-test-id="credential-card-dynamic"
						>
							<PrivateCredentialIcon
								:tooltip-title="locale.baseText('credentials.private.tooltipTitle')"
								:tooltip-text="locale.baseText('credentials.private.tooltip')"
								size="small"
							/>
						</span>
					</div>
					<N8nTooltip
						v-if="credentialDescriptionsEnabled && data.description"
						placement="top"
						as-child
					>
						<template #content>{{ data.description }}</template>
						<N8nText
							tag="p"
							size="small"
							color="text-light"
							:class="$style.credentialDescription"
							data-test-id="credential-card-description"
						>
							{{ data.description }}
						</N8nText>
					</N8nTooltip>
				</div>
				<span v-if="isPrivateUnconnected" :class="$style.nameActions" @click.stop>
					<N8nTooltip placement="top">
						<template #content>
							{{ locale.baseText('credentials.item.connect.tooltip') }}
						</template>
						<N8nButton
							size="mini"
							:loading="isConnecting"
							data-test-id="credential-card-connect"
							@click="onConnect"
						>
							{{ locale.baseText('credentials.item.connect') }}
						</N8nButton>
					</N8nTooltip>
				</span>
			</template>
			<template #type>
				<N8nText v-if="credentialType" size="small" color="text-light" :class="$style.meta">
					{{ credentialType.displayName }}
				</N8nText>
			</template>
			<template #location>
				<span :class="$style.cellContent" @click.stop>
					<ProjectCardBadge
						:class="$style.cardBadge"
						:resource="data"
						:resource-type="ResourceType.Credential"
						:resource-type-label="resourceTypeLabel"
						:personal-project="projectsStore.personalProject"
						:show-badge-border="false"
						:global="data.isGlobal"
					/>
				</span>
			</template>
			<template #updated>
				<N8nText size="small" color="text-light" :class="$style.meta">
					<TimeAgo :date="data.updatedAt" />
				</N8nText>
			</template>
			<template #created>
				<N8nText size="small" color="text-light" :class="$style.meta">
					{{ formattedCreatedAtDate }}
				</N8nText>
			</template>
			<template #dependencies>
				<span :class="$style.cellContent" @click.stop>
					<DependencyPill
						v-if="credentialHasDependents"
						resource-type="credential"
						:resource-id="data.id"
						source="credential_card"
						data-test-id="credential-card-dependents"
					/>
				</span>
			</template>
			<template #actions>
				<span :class="$style.cellContent" @click.stop>
					<span data-row-menu>
						<N8nActionToggle
							data-test-id="credential-card-actions"
							:actions="actions"
							theme="dark"
							@action="onAction"
						/>
					</span>
				</span>
			</template>
		</ResourceListRow>
	</N8nCard>
</template>

<style lang="scss" module>
.nameBlock {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.nameLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.cardHeading {
	min-width: 0;
	font-size: var(--font-size--sm);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.credentialDescription {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.indicator {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
}

// Row-specific controls sit at the end of the name column.
.nameActions {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-left: auto;
	cursor: default;
}

.meta {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cardBadge {
	min-width: 0;
	max-width: 100%;
}

// Controls in a cell must not open the credential.
.cellContent {
	display: contents;
}
</style>
