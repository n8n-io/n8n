<script lang="ts" setup>
import { computed, toRef } from 'vue';
import SecretsProviderImage from './SecretsProviderImage.ee.vue';
import {
	N8nActionToggle,
	N8nBadge,
	N8nCard,
	N8nHeading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { SecretProviderConnection, SecretProviderTypeResponse } from '@n8n/api-types';
import { DateTime } from 'luxon';
import { isDateObject } from '@/app/utils/typeGuards';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@/app/stores/rbac.store';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

const i18n = useI18n();
const rbacStore = useRBACStore();
const { check: checkDevFeatureFlag } = useEnvFeatureFlag();
const isProjectScopedSecretsEnabled = checkDevFeatureFlag.value('EXTERNAL_SECRETS_FOR_PROJECTS');

const props = defineProps<{
	provider: SecretProviderConnection;
	providerTypeInfo?: SecretProviderTypeResponse;
	project?: ProjectListItem | null;
	canUpdate: boolean;
}>();

const emit = defineEmits<{
	edit: [providerKey: string];
	share: [providerKey: string];
	reload: [providerKey: string];
	delete: [providerKey: string];
}>();

const provider = toRef(props, 'provider');
const providerTypeInfo = toRef(props, 'providerTypeInfo');

const formattedDate = computed(() => {
	return DateTime.fromISO(
		isDateObject(provider.value.createdAt)
			? provider.value.createdAt.toISOString()
			: provider.value.createdAt || new Date().toISOString(),
	).toFormat('dd LLL yyyy');
});

const showDisconnectedBadge = computed(() => {
	return provider.value.state === 'error';
});

const canDelete = computed(() => rbacStore.hasScope('externalSecretsProvider:delete'));

const isGlobal = computed(() => provider.value.projects.length === 0);

const projectName = computed(() => {
	if (props.project) {
		const { name, email } = splitName(props.project.name ?? undefined);
		return name ?? email ?? '';
	}
	return '';
});

const badgeIcon = computed<IconOrEmoji>(() => {
	if (isGlobal.value) {
		return { type: 'icon', value: 'globe' };
	}
	return isIconOrEmoji(props.project?.icon)
		? props.project.icon
		: { type: 'icon', value: 'layers' };
});

const badgeTooltip = computed(() => {
	if (isGlobal.value) {
		return i18n.baseText('settings.secretsProviderConnections.badge.tooltip.global');
	}
	return i18n.baseText('settings.secretsProviderConnections.badge.tooltip.project', {
		interpolate: {
			projectName: projectName.value,
		},
	});
});

const actionDropdownOptions = computed(() => {
	if (!props.canUpdate) return [];

	const options = [
		{
			label: i18n.baseText('generic.edit'),
			value: 'edit',
		},
	];
	if (isProjectScopedSecretsEnabled) {
		options.push({
			label: i18n.baseText('settings.secretsProviderConnections.actions.share'),
			value: 'share',
		});
	}

	if (provider.value.state === 'connected') {
		options.push({
			label: i18n.baseText('settings.externalSecrets.card.actionDropdown.reload'),
			value: 'reload',
		});
	}

	if (canDelete.value) {
		options.push({
			label: i18n.baseText('generic.delete'),
			value: 'delete',
		});
	}

	return options;
});

function onAction(action: string) {
	if (action === 'edit') {
		emit('edit', provider.value.name);
	} else if (action === 'share') {
		emit('share', provider.value.name);
	} else if (action === 'reload') {
		emit('reload', provider.value.name);
	} else if (action === 'delete') {
		emit('delete', provider.value.name);
	}
}
</script>

<template>
	<N8nCard :class="$style.card">
		<template v-if="providerTypeInfo" #prepend>
			<SecretsProviderImage
				:class="$style.providerImage"
				:provider="providerTypeInfo"
				data-test-id="secrets-provider-image"
			/>
		</template>
		<template #header>
			<div :class="$style.headerContainer">
				<N8nHeading tag="h2" bold data-test-id="secrets-provider-name">{{
					provider.name
				}}</N8nHeading>
				<N8nBadge
					v-if="showDisconnectedBadge"
					theme="warning"
					:bold="false"
					size="xsmall"
					data-test-id="disconnected-badge"
				>
					{{ i18n.baseText('settings.secretsProviderConnections.state.disconnected') }}
				</N8nBadge>
			</div>
		</template>
		<template #default>
			<N8nText class="pb-4xs" color="text-light" size="small">
				<span data-test-id="secrets-provider-display-name">
					{{ providerTypeInfo?.displayName ?? provider.type }}
				</span>
				|
				<span data-test-id="secrets-provider-secrets-count">
					{{
						provider.secretsCount === 1
							? i18n.baseText('settings.externalSecrets.card.secretCount', {
									interpolate: {
										count: `${provider.secretsCount}`,
									},
								})
							: i18n.baseText('settings.externalSecrets.card.secretsCount', {
									interpolate: {
										count: `${provider.secretsCount}`,
									},
								})
					}}
				</span>
				|
				<span data-test-id="secrets-provider-created-at">
					{{
						i18n.baseText('settings.secretsProviderConnections.card.createdAt', {
							interpolate: {
								date: formattedDate,
							},
						})
					}}
				</span>
			</N8nText>
		</template>
		<template #append>
			<N8nTooltip :class="$style.cardBadge" placement="top">
				<N8nBadge
					:class="$style.badge"
					theme="tertiary"
					:data-test-id="
						isGlobal ? 'secrets-provider-global-badge' : 'secrets-provider-project-badge'
					"
				>
					<ProjectIcon :icon="badgeIcon" :border-less="true" size="mini" />
					<span v-if="!isGlobal" v-n8n-truncate:20="projectName" :class="$style.nowrap">
						{{ projectName }}
					</span>
					<span v-else>
						{{ i18n.baseText('projects.badge.global') }}
					</span>
				</N8nBadge>
				<template #content>
					{{ badgeTooltip }}
				</template>
			</N8nTooltip>
			<N8nActionToggle
				:actions="actionDropdownOptions"
				data-test-id="secrets-provider-action-toggle"
				@action="onAction"
			/>
		</template>
	</N8nCard>
</template>

<style lang="css" module>
.card {
	--card--padding: var(--spacing--2xs);
	padding-left: var(--spacing--sm);
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: var(--shadow--card-hover);
	}
}

.providerImage {
	width: 100%;
	height: 100%;
}

.headerContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.cardBadge {
	margin-right: var(--spacing--3xs);
}

.badge {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--color--background--light-3);
	border-color: var(--color--foreground);
	height: var(--spacing--lg);
	cursor: pointer;

	& > span {
		display: flex;
		gap: var(--spacing--3xs);
		align-items: center;
	}
}

.nowrap {
	white-space: nowrap !important;
}
</style>
