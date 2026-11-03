<script setup lang="ts">
import type { AppResponse, AppVersionResponse } from '@n8n/api-types';
import {
	N8nActionDropdown,
	N8nBadge,
	N8nButton,
	N8nIconButton,
	N8nLoading,
	N8nText,
	N8nTimeAgo,
	N8nTooltip,
	type ActionDropdownItem,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import { restoreAppVersion } from '../../apps.api';
import { getAppPermissions } from '../../apps.permissions';
import {
	getAppVersionLabel,
	isBuilding,
	isBuilt,
	type AppVersions,
} from '../../composables/useAppVersions';
import AppPublishDialog from '../publish/AppPublishDialog.vue';

const props = defineProps<{ app: AppResponse; versions: AppVersions }>();

const emit = defineEmits<{ updated: [app: AppResponse]; restored: []; close: [] }>();

type VersionAction = 'publish' | 'restore';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const { versions: list, loading, failed } = props.versions;

const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
const selected = ref<AppVersionResponse | null>(null);
const publishOpen = ref(false);
const restoring = ref(false);

function isDraft(version: AppVersionResponse) {
	return version.id === props.app.draftVersionId;
}

function publishDisabledReason(version: AppVersionResponse) {
	if (!canUpdate.value) return i18n.baseText('apps.versions.noPermission');
	if (isBuilt(version)) return undefined;
	return i18n.baseText(
		isDraft(version) ? 'apps.versions.notBuilt' : 'apps.versions.notBuiltRestore',
	);
}

function actions(version: AppVersionResponse) {
	const items: Array<ActionDropdownItem<VersionAction>> = [];
	if (version.id !== props.app.publishedVersionId) {
		const reason = publishDisabledReason(version);
		items.push({
			id: 'publish',
			label: i18n.baseText('apps.versions.publish'),
			disabled: reason !== undefined,
			description: reason,
		});
	}
	if (!isDraft(version)) {
		items.push({
			id: 'restore',
			label: i18n.baseText('apps.versions.restore'),
			disabled: !canUpdate.value || restoring.value,
			description: canUpdate.value ? undefined : i18n.baseText('apps.versions.noPermission'),
		});
	}
	return items;
}

async function restore(version: AppVersionResponse) {
	restoring.value = true;
	try {
		await restoreAppVersion(
			rootStore.restApiContext,
			props.app.projectId,
			props.app.id,
			version.id,
			{
				baseVersionId: props.app.draftVersionId,
			},
		);
		emit('restored');
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.versions.restoreError'));
		// A changed draft makes the restore fail, so reload to show the current draft.
		if (error instanceof ResponseError && error.httpStatusCode === 409) emit('restored');
	} finally {
		restoring.value = false;
	}
}

async function onSelect(action: VersionAction, version: AppVersionResponse) {
	if (!actions(version).some((item) => item.id === action && !item.disabled)) return;
	if (action === 'restore') {
		await restore(version);
		return;
	}
	selected.value = version;
	publishOpen.value = true;
}
</script>

<template>
	<aside :class="$style.panel" data-test-id="app-versions-panel">
		<header :class="$style.header">
			<N8nText bold color="text-dark">{{ i18n.baseText('apps.versions.title') }}</N8nText>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('generic.close')"
				data-test-id="app-versions-close"
				@click="emit('close')"
			/>
		</header>
		<div :class="$style.body">
			<N8nLoading
				v-if="loading && !list.length"
				:loading="true"
				:rows="3"
				data-test-id="app-versions-loading"
			/>
			<div
				v-else-if="failed && !list.length"
				:class="$style.error"
				data-test-id="app-versions-error"
			>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('apps.versions.loadError') }}
				</N8nText>
				<N8nButton
					variant="outline"
					size="small"
					:label="i18n.baseText('generic.retry')"
					data-test-id="app-versions-retry"
					@click="versions.refresh()"
				/>
			</div>
			<N8nText
				v-else-if="!list.length"
				size="small"
				color="text-light"
				data-test-id="app-versions-empty"
			>
				{{ i18n.baseText('apps.versions.empty') }}
			</N8nText>
			<div
				v-for="(version, index) in list"
				v-else
				:key="version.id"
				:class="[$style.row, { [$style.current]: index === 0 }]"
				data-test-id="app-version-row"
			>
				<div :class="$style.text">
					<N8nText color="text-dark">{{ getAppVersionLabel(version) }}</N8nText>
					<N8nText size="small" color="text-light">
						<N8nTimeAgo :date="version.createdAt" :locale="rootStore.defaultLocale" />
					</N8nText>
					<N8nBadge
						v-if="version.id === app.publishedVersionId"
						:class="$style.badge"
						variant="success"
						data-test-id="app-version-published"
					>
						{{ i18n.baseText('apps.publish.published') }}
					</N8nBadge>
					<N8nBadge
						v-else-if="isBuilding(version.buildStatus)"
						:class="$style.badge"
						variant="info"
						data-test-id="app-version-status"
					>
						{{ i18n.baseText('apps.preview.building') }}
					</N8nBadge>
					<N8nBadge
						v-else-if="version.buildStatus === 'failed'"
						:class="$style.badge"
						variant="danger"
						data-test-id="app-version-status"
					>
						{{ i18n.baseText('apps.preview.buildFailed') }}
					</N8nBadge>
				</div>
				<N8nActionDropdown
					v-if="actions(version).length"
					:items="actions(version)"
					placement="bottom-end"
					data-test-id="app-version-actions"
					@select="onSelect($event, version)"
				>
					<template #menuItem="item">
						<N8nTooltip :content="item.description" :disabled="!item.description" placement="left">
							<span>{{ item.label }}</span>
						</N8nTooltip>
					</template>
					<template #activator>
						<N8nIconButton
							icon="ellipsis"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('apps.versions.actions')"
						/>
					</template>
				</N8nActionDropdown>
			</div>
		</div>
		<AppPublishDialog
			v-if="selected"
			v-model:open="publishOpen"
			:app="app"
			:version="selected"
			@updated="emit('updated', $event)"
		/>
	</aside>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	inset-block: 0;
	inset-inline-end: 0;
	z-index: 1;
	display: flex;
	flex-direction: column;
	width: 20rem;
	max-width: 100%;
	background-color: var(--background--surface);
	border-left: var(--border);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	overflow-y: auto;
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border-radius: var(--radius--lg);
}

.current {
	background-color: var(--background--subtle);
}

.text {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
}

.error {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.badge {
	align-self: flex-start;
	margin-top: var(--spacing--4xs);
}
</style>
