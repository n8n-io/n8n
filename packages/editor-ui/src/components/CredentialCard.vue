<script setup lang="ts">
import { computed } from 'vue';
import dateformat from 'dateformat';
import type { ICredentialsResponse } from '@/Interface';
import { MODAL_CONFIRM, PROJECT_MOVE_RESOURCE_MODAL } from '@/constants';
import { useMessage } from '@/composables/useMessage';
import CredentialIcon from '@/components/CredentialIcon.vue';
import { getCredentialPermissions } from '@/permissions';
import { useUIStore } from '@/stores/ui.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import TimeAgo from '@/components/TimeAgo.vue';
import type { ProjectSharingData } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';
import ProjectCardBadge from '@/components/Projects/ProjectCardBadge.vue';
import { useI18n } from '@/composables/useI18n';

const CREDENTIAL_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	DELETE: 'delete',
	MOVE: 'move',
};

const props = withDefaults(
	defineProps<{
		data: ICredentialsResponse;
		readOnly?: boolean;
	}>(),
	{
		data: () => ({
			id: '',
			createdAt: '',
			updatedAt: '',
			type: '',
			name: '',
			sharedWithProjects: [],
			homeProject: {} as ProjectSharingData,
		}),
		readOnly: false,
	},
);

const locale = useI18n();
const message = useMessage();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();

const credentialType = computed(() => credentialsStore.getCredentialTypeByName(props.data.type));
const credentialPermissions = computed(() => getCredentialPermissions(props.data));
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

	if (credentialPermissions.value.move) {
		items.push({
			label: locale.baseText('credentials.item.move'),
			value: CREDENTIAL_LIST_ITEM_ACTIONS.MOVE,
		});
	}

	return items;
});
const formattedCreatedAtDate = computed(() => {
	const currentYear = new Date().getFullYear().toString();

	return dateformat(
		props.data.createdAt,
		`d mmmm${props.data.createdAt.startsWith(currentYear) ? '' : ', yyyy'}`,
	);
});

function onClick() {
	uiStore.openExistingCredential(props.data.id);
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

function moveResource() {
	uiStore.openModalWithData({
		name: PROJECT_MOVE_RESOURCE_MODAL,
		data: {
			resource: props.data,
			resourceType: locale.baseText('generic.credential').toLocaleLowerCase(),
		},
	});
}
</script>

<template>
	<n8n-card :class="$style.cardLink" @click="onClick">
		<template #prepend>
			<CredentialIcon :credential-type-name="credentialType?.name ?? ''" />
		</template>
		<template #header>
			<n8n-heading tag="h2" bold :class="$style.cardHeading">
				{{ data.name }}
			</n8n-heading>
		</template>
		<div :class="$style.cardDescription">
			<n8n-text color="text-light" size="small">
				<span v-if="credentialType">{{ credentialType.displayName }} | </span>
				<span v-show="data"
					>{{ $locale.baseText('credentials.item.updated') }} <TimeAgo :date="data.updatedAt" /> |
				</span>
				<span v-show="data"
					>{{ $locale.baseText('credentials.item.created') }} {{ formattedCreatedAtDate }}
				</span>
			</n8n-text>
		</div>
		<template #append>
			<div :class="$style.cardActions" @click.stop>
				<ProjectCardBadge :resource="data" :personal-project="projectsStore.personalProject" />
				<n8n-action-toggle
					data-test-id="credential-card-actions"
					:actions="actions"
					theme="dark"
					@action="onAction"
				/>
			</div>
		</template>
	</n8n-card>
</template>

<style lang="scss" module>
.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0 0 0 var(--spacing-s);
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
	font-size: var(--font-size-s);
	padding: var(--spacing-s) 0 0;

	span {
		color: var(--color-text-light);
	}
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing-s);
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing-s) 0 0;
	cursor: default;
}
</style>
