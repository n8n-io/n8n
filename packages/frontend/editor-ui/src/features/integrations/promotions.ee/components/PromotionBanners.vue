<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useUsersStore } from '@n8n/stores/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';
import { PROMOTION_SELECT_MODAL_KEY } from '../promotions.constants';
import { promotionEventBus } from '../promotions.eventBus';
import { usePromotionConnection } from '../composables/usePromotionConnection';
import { usePromotionChangeCount } from '../composables/usePromotionChangeCount';

const i18n = useI18n();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const { isEnabled: isPromotionsEnabled } = usePromotionsEnabled();

const currentProjectId = computed(() => projectsStore.currentProject?.id);
const isTeamProject = computed(() => projectsStore.currentProject?.type === ProjectTypes.Team);
const projectPermissions = computed(
	() => getResourcePermissions(projectsStore.currentProject?.scopes).project,
);
const gitConnectionPermissions = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).gitConnection,
);

// Each banner needs the direction configured on the instance connection, so a
// source never asks for incoming changes and a destination never asks for outgoing ones.
const {
	connection,
	hasPromoteConfig,
	hasApplyConfig,
	load: loadConnection,
} = usePromotionConnection();

const canPreviewChanges = computed(
	() =>
		isTeamProject.value &&
		isPromotionsEnabled.value &&
		!!projectPermissions.value.export &&
		!!gitConnectionPermissions.value.list &&
		(!!gitConnectionPermissions.value.push || !!gitConnectionPermissions.value.pull),
);
const showPromoteBanner = computed(
	() => canPreviewChanges.value && hasPromoteConfig.value && !!gitConnectionPermissions.value.push,
);

const showIncomingBanner = computed(
	() => canPreviewChanges.value && hasApplyConfig.value && !!gitConnectionPermissions.value.pull,
);

watch(
	[canPreviewChanges, currentProjectId],
	async ([canPreview]) => {
		if (canPreview) await loadConnection();
	},
	{ immediate: true },
);
const { count: promotableChangeCount, refetch: refetchPromotable } = usePromotionChangeCount(
	currentProjectId,
	'promote',
	showPromoteBanner,
);
const {
	count: incomingChangeCount,
	failed: incomingCheckFailed,
	refetch: refetchIncoming,
} = usePromotionChangeCount(currentProjectId, 'apply', showIncomingBanner);

// An apply changes both counts and can rename the project, so the header shows the new name.
async function onPromotionApplied() {
	await Promise.all([refetchPromotable(), refetchIncoming(), refetchProject()]);
}

async function refetchProject() {
	const projectId = currentProjectId.value;
	if (!projectId) return;
	try {
		const project = await projectsStore.fetchProject(projectId);
		// The user may have moved to another project while this one loaded.
		if (currentProjectId.value === projectId) projectsStore.setCurrentProject(project);
	} catch {
		// The applied package removed this project, the workflows view leaves the page.
	}
}

onMounted(() => {
	promotionEventBus.on('applied', onPromotionApplied);
});

onBeforeUnmount(() => {
	promotionEventBus.off('applied', onPromotionApplied);
});

const promotionBannerText = computed(() => {
	if (promotableChangeCount.value === 1) {
		return i18n.baseText('promotions.banner.singleChangeAvailable');
	}
	return i18n.baseText('promotions.banner.changesAvailable', {
		interpolate: { count: String(promotableChangeCount.value) },
	});
});

const incomingBannerText = computed(() => {
	if (incomingCheckFailed.value) return i18n.baseText('promotions.banner.incoming.error');
	if (incomingChangeCount.value === 1) {
		return i18n.baseText('promotions.banner.incoming.singleChangeAvailable');
	}
	return i18n.baseText('promotions.banner.incoming.changesAvailable', {
		interpolate: { count: String(incomingChangeCount.value) },
	});
});

function onOpenPromotionModal() {
	if (!currentProjectId.value) return;
	uiStore.openModalWithData({
		name: PROMOTION_SELECT_MODAL_KEY,
		data: { projectId: currentProjectId.value },
	});
}

function onOpenIncomingModal() {
	const applyConfig = connection.value?.configs.apply;
	if (!currentProjectId.value || !connection.value || !applyConfig) return;
	uiStore.openModalWithData({
		name: PROMOTION_SELECT_MODAL_KEY,
		data: {
			projectId: currentProjectId.value,
			direction: 'apply',
			apply: {
				connectionId: connection.value.id,
				configId: applyConfig.id,
				branchName: applyConfig.settings.branchName,
			},
		},
	});
}
</script>

<template>
	<div>
		<div
			v-if="showPromoteBanner && promotableChangeCount > 0"
			:class="$style.banner"
			data-test-id="promotion-banner"
		>
			<N8nIcon icon="upload" size="small" />
			<N8nText size="small">
				{{ promotionBannerText }}
			</N8nText>
			<N8nLink size="small" data-test-id="promotion-banner-link" @click="onOpenPromotionModal">
				{{ i18n.baseText('promotions.banner.viewChanges') }}
			</N8nLink>
		</div>
		<div
			v-if="showIncomingBanner && (incomingChangeCount > 0 || incomingCheckFailed)"
			:class="$style.banner"
			data-test-id="promotion-incoming-banner"
		>
			<N8nIcon :icon="incomingCheckFailed ? 'triangle-alert' : 'download'" size="small" />
			<N8nText size="small">
				{{ incomingBannerText }}
			</N8nText>
			<N8nLink
				size="small"
				data-test-id="promotion-incoming-banner-link"
				@click="onOpenIncomingModal"
			>
				{{ i18n.baseText('promotions.banner.viewChanges') }}
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.banner {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: var(--background--hover);
	border: var(--border);
	border-radius: var(--radius--2xs);
	margin-bottom: var(--spacing--xs);
}
</style>
