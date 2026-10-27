<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nBadge, N8nTooltip, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { getResourcePermissions } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { VIEWS } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';

import { useInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import { usePromotionChangeCount } from '../composables/usePromotionChangeCount';
import { promotionEventBus, type PromotionEventBusEvents } from '../promotions.eventBus';
import { PROMOTION_PREVIEW_VIEWS } from '../promotions.constants';

const i18n = useI18n();
const router = useRouter();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const { isEnabled: isPromotionsEnabled } = usePromotionsEnabled();

const currentProjectId = computed(() => projectsStore.currentProject?.id);
const isTeamProject = computed(() => projectsStore.currentProject?.type === ProjectTypes.Team);
const projectPermissions = computed(
	() => getResourcePermissions(projectsStore.currentProject?.scopes).project,
);
const promotionsPermissions = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).promotions,
);

// Each direction needs its configuration on the instance connection, so a source never
// asks for incoming changes and a destination never asks for outgoing ones.
const { hasPromoteConfig, hasApplyConfig, load: loadConnection } = useInstancePromotionConnection();

const canPreviewChanges = computed(
	() =>
		isTeamProject.value &&
		isPromotionsEnabled.value &&
		!!projectPermissions.value.export &&
		// `list` loads the connection. `read` loads the preview, as on the preview page.
		!!promotionsPermissions.value.list &&
		!!promotionsPermissions.value.read &&
		(!!promotionsPermissions.value.promote || !!promotionsPermissions.value.apply),
);
const showPromote = computed(
	() => canPreviewChanges.value && hasPromoteConfig.value && !!promotionsPermissions.value.promote,
);
const showApply = computed(
	() => canPreviewChanges.value && hasApplyConfig.value && !!promotionsPermissions.value.apply,
);

watch(
	[canPreviewChanges, currentProjectId],
	async ([canPreview]) => {
		if (canPreview) await loadConnection();
	},
	{ immediate: true },
);

const promote = usePromotionChangeCount(currentProjectId, 'promote', showPromote);
const apply = usePromotionChangeCount(currentProjectId, 'apply', showApply);

// The store's project id follows the route at once, the current project only once it loaded,
// so a result for a project the user already left is dropped here.
async function onPromotionApplied({ projectId, project }: PromotionEventBusEvents['applied']) {
	if (project && projectsStore.currentProjectId === projectId) {
		projectsStore.setCurrentProject(project);
	}
	await Promise.all([promote.refetch(), apply.refetch()]);
}

async function onPromoted({ projectId }: PromotionEventBusEvents['promoted']) {
	if (projectsStore.currentProjectId !== projectId) return;
	await promote.refetch();
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

const ICONS: Record<PromotionDirection, IconName> = { apply: 'arrow-down', promote: 'arrow-up' };

// The tooltip trigger is the span or link itself (`as-child`), so keyboard focus opens it.
// A blocked badge only informs. Its span takes the focus and the hover, because a disabled
// button does neither, and the tooltip gives the reason.
const badges = computed(() => {
	const projectId = currentProjectId.value;
	if (!projectId) return [];
	const entries = [
		{ direction: 'apply' as const, show: showApply.value, changes: apply },
		{ direction: 'promote' as const, show: showPromote.value, changes: promote },
	];
	return entries
		.filter(
			({ show, changes }) =>
				show && (changes.failed.value || changes.changeCount.value > 0 || !!changes.blocker.value),
		)
		.map(({ direction, changes }) => ({
			direction,
			failed: changes.failed.value,
			blocked: !!changes.blocker.value,
			changeCount: changes.changeCount.value,
			label: changes.failed.value
				? i18n.baseText(`promotions.preview.badge.failed.${direction}`)
				: changes.blocker.value
					? i18n.baseText('promotions.preview.badge.blocked.promote')
					: i18n.baseText(`promotions.preview.badge.${direction}`, {
							adjustToNumber: changes.changeCount.value,
							interpolate: { count: String(changes.changeCount.value) },
						}),
			to: { name: PROMOTION_PREVIEW_VIEWS[direction], params: { projectId } },
		}));
});
</script>

<template>
	<div v-if="badges.length > 0" :class="$style.badges" data-test-id="promotion-preview-badges">
		<N8nTooltip v-for="badge in badges" :key="badge.direction" :content="badge.label" as-child>
			<span
				v-if="badge.blocked"
				role="button"
				tabindex="0"
				aria-disabled="true"
				:aria-label="badge.label"
				:class="[$style.link, $style.disabled]"
				:data-test-id="`promotion-preview-badge-${badge.direction}`"
			>
				<N8nBadge
					:class="$style.inert"
					variant="subtle"
					size="small"
					:leading-icon="ICONS[badge.direction]"
					clickable
					disabled
					aria-hidden="true"
				/>
			</span>
			<RouterLink
				v-else
				:to="badge.to"
				:aria-label="badge.label"
				:class="$style.link"
				:data-test-id="`promotion-preview-badge-${badge.direction}`"
			>
				<N8nBadge
					:variant="badge.failed ? 'warning' : 'subtle'"
					size="small"
					:leading-icon="badge.failed ? 'circle-alert' : ICONS[badge.direction]"
				>
					<template v-if="!badge.failed" #default>{{ badge.changeCount }}</template>
				</N8nBadge>
			</RouterLink>
		</N8nTooltip>
	</div>
</template>

<style module lang="scss">
.badges {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.link {
	display: inline-flex;
	/* Matches the small badge, so the focus ring follows its shape. */
	border-radius: var(--radius--xs);

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--focus--border-width);
	}
}

.disabled {
	cursor: not-allowed;
}

/* The disabled badge swallows pointer events, so the span around it gets them. */
.inert {
	pointer-events: none;
}
</style>
