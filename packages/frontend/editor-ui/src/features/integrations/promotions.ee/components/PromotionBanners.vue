<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { N8nIcon, N8nIconButton, N8nLink, N8nText, N8nTooltip } from '@n8n/design-system';
import { useUsersStore } from '@n8n/stores/users.store';
import { VIEWS } from '@/app/constants';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';
import { PROMOTION_SELECT_MODAL_KEY } from '../promotions.constants';
import { promotionEventBus, type PromotionEventBusEvents } from '../promotions.eventBus';
import { useInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import { usePromotionChangeCount } from '../composables/usePromotionChangeCount';

const i18n = useI18n();
const router = useRouter();
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
} = useInstancePromotionConnection();

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
const {
	count: promotableChangeCount,
	failed: promotableCheckFailed,
	isLoading: isPromotableRefreshing,
	lastRefreshedAt: promotableRefreshedAt,
	refetch: refetchPromotable,
} = usePromotionChangeCount(currentProjectId, 'promote', showPromoteBanner);
const {
	count: incomingChangeCount,
	failed: incomingCheckFailed,
	isLoading: isIncomingRefreshing,
	lastRefreshedAt: incomingRefreshedAt,
	refetch: refetchIncoming,
} = usePromotionChangeCount(currentProjectId, 'apply', showIncomingBanner);

// The store's project id follows the route at once, the current project only once it loaded,
// so a result for a project the user already left is dropped here.
async function onPromotionApplied({ projectId, project }: PromotionEventBusEvents['applied']) {
	if (project && projectsStore.currentProjectId === projectId) {
		projectsStore.setCurrentProject(project);
	}
	await Promise.all([refetchPromotable(), refetchIncoming()]);
}

async function onProjectRemoved({ projectId }: PromotionEventBusEvents['projectRemoved']) {
	if (projectsStore.currentProjectId !== projectId) return;
	await router.replace({ name: VIEWS.HOMEPAGE });
}

onMounted(() => {
	promotionEventBus.on('applied', onPromotionApplied);
	promotionEventBus.on('projectRemoved', onProjectRemoved);
});

onBeforeUnmount(() => {
	promotionEventBus.off('applied', onPromotionApplied);
	promotionEventBus.off('projectRemoved', onProjectRemoved);
});

const promotionBannerText = computed(() => {
	if (promotableCheckFailed.value) return i18n.baseText('promotions.banner.error');
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
		data: { projectId: currentProjectId.value, direction: 'promote' },
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
			v-if="showPromoteBanner && (promotableChangeCount > 0 || promotableCheckFailed)"
			:class="$style.banner"
			data-test-id="promotion-banner"
		>
			<N8nIcon :icon="promotableCheckFailed ? 'triangle-alert' : 'upload'" size="small" />
			<N8nText size="small">
				{{ promotionBannerText }}
			</N8nText>
			<N8nLink size="small" data-test-id="promotion-banner-link" @click="onOpenPromotionModal">
				{{ i18n.baseText('promotions.banner.viewChanges') }}
			</N8nLink>
			<N8nText
				v-if="promotableRefreshedAt"
				size="small"
				color="text-light"
				:class="$style.lastRefreshed"
				data-test-id="promotion-banner-last-refreshed"
			>
				{{ i18n.baseText('promotions.lastRefreshed') }}
				<TimeAgo :date="promotableRefreshedAt" live />
			</N8nText>
			<N8nTooltip :content="i18n.baseText('generic.refresh')">
				<N8nIconButton
					icon="refresh-cw"
					size="small"
					variant="ghost"
					:loading="isPromotableRefreshing"
					:disabled="isPromotableRefreshing"
					:aria-label="i18n.baseText('generic.refresh')"
					data-test-id="promotion-banner-refresh"
					@click="refetchPromotable"
				/>
			</N8nTooltip>
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
			<N8nText
				v-if="incomingRefreshedAt"
				size="small"
				color="text-light"
				:class="$style.lastRefreshed"
				data-test-id="promotion-incoming-banner-last-refreshed"
			>
				{{ i18n.baseText('promotions.lastRefreshed') }}
				<TimeAgo :date="incomingRefreshedAt" live />
			</N8nText>
			<N8nTooltip :content="i18n.baseText('generic.refresh')">
				<N8nIconButton
					icon="refresh-cw"
					size="small"
					variant="ghost"
					:loading="isIncomingRefreshing"
					:disabled="isIncomingRefreshing"
					:aria-label="i18n.baseText('generic.refresh')"
					data-test-id="promotion-incoming-banner-refresh"
					@click="refetchIncoming"
				/>
			</N8nTooltip>
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

.lastRefreshed {
	margin-left: auto;
	white-space: nowrap;
}
</style>
