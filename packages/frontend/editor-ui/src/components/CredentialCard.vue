<script setup lang="ts">
import { computed } from 'vue';
import dateformat from 'dateformat';
import { MODAL_CONFIRM, PROJECT_MOVE_RESOURCE_MODAL } from '@/constants';
import { useMessage } from '@/composables/useMessage';
import CredentialIcon from '@/components/CredentialIcon.vue';
import { getResourcePermissions } from '@n8n/permissions';
import { useUIStore } from '@/stores/ui.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import TimeAgo from '@/components/TimeAgo.vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import ProjectCardBadge from '@/features/projects/components/ProjectCardBadge.vue';
import { useI18n } from '@n8n/i18n';
import { ResourceType } from '@/features/projects/projects.utils';
import type { CredentialsResource } from '@/Interface';

import { N8nActionToggle, N8nBadge, N8nCard, N8nText } from '@n8n/design-system';
const CREDENTIAL_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	DELETE: 'delete',
	MOVE: 'move',
};

const emit = defineEmits<{
	click: [credentialId: string];
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
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();

const resourceTypeLabel = computed(() => locale.baseText('generic.credential').toLowerCase());
const credentialType = computed(() =>
	credentialsStore.getCredentialTypeByName(props.data.type ?? ''),
);
const credentialPermissions = computed(() => getResourcePermissions(props.data.scopes).credential);
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

	return items;
});
const formattedCreatedAtDate = computed(() => {
	const currentYear = new Date().getFullYear().toString();

	return dateformat(
		props.data.createdAt,
		`d mmmm${String(props.data.createdAt).startsWith(currentYear) ? '' : ', yyyy'}`,
	);
});

function onClick() {
	emit('click', props.data.id);
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
				<ProjectCardBadge
					:class="$style.cardBadge"
					:resource="data"
					:resource-type="ResourceType.Credential"
					:resource-type-label="resourceTypeLabel"
					:personal-project="projectsStore.personalProject"
					:show-badge-border="false"
				/>
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
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
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
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing--sm) 0 0;
	cursor: default;
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
