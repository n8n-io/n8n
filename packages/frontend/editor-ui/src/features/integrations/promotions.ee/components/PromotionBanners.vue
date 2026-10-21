<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { PROMOTION_SELECT_MODAL_KEY } from '../promotions.constants';
import { promotionEventBus, type PromotionEventBusEvents } from '../promotions.eventBus';
import { usePromotionEntryPoints } from '../composables/usePromotionEntryPoints';

const i18n = useI18n();
const router = useRouter();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();

const {
	currentProjectId,
	showPromote: showPromoteBanner,
	showApply: showIncomingBanner,
	promote: { workflowCount: promotableChangeCount, refetch: refetchPromotable },
	apply: {
		workflowCount: incomingChangeCount,
		failed: incomingCheckFailed,
		refetch: refetchIncoming,
	},
} = usePromotionEntryPoints();

// The store's project id follows the route at once, the current project only once it loaded,
// so a result for a project the user already left is dropped here.
async function onPromotionApplied({ projectId, project }: PromotionEventBusEvents['applied']) {
	if (project && projectsStore.currentProjectId === projectId) {
		projectsStore.setCurrentProject(project);
	}
	await Promise.all([refetchPromotable(), refetchIncoming()]);
}

async function onPromoted({ projectId }: PromotionEventBusEvents['promoted']) {
	if (projectsStore.currentProjectId !== projectId) return;
	await refetchPromotable();
}

async function onProjectRemoved({ projectId }: PromotionEventBusEvents['projectRemoved']) {
	if (projectsStore.currentProjectId !== projectId) return;
	await router.replace({ name: VIEWS.HOMEPAGE });
}

onMounted(() => {
	promotionEventBus.on('applied', onPromotionApplied);
	promotionEventBus.on('promoted', onPromoted);
	promotionEventBus.on('projectRemoved', onProjectRemoved);
});

onBeforeUnmount(() => {
	promotionEventBus.off('applied', onPromotionApplied);
	promotionEventBus.off('promoted', onPromoted);
	promotionEventBus.off('projectRemoved', onProjectRemoved);
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
		data: { projectId: currentProjectId.value, direction: 'promote' },
	});
}

function onOpenIncomingModal() {
	if (!currentProjectId.value) return;
	uiStore.openModalWithData({
		name: PROMOTION_SELECT_MODAL_KEY,
		data: { projectId: currentProjectId.value, direction: 'apply' },
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
