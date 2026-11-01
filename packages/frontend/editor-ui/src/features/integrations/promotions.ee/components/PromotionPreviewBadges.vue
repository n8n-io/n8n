<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nBadge, N8nIcon, N8nTooltip, type IconName } from '@n8n/design-system';
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
const {
	environments,
	hasPromoteConfig,
	hasApplyConfig,
	load: loadConnection,
} = useInstancePromotionConnection();

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
		.filter(({ show }) => show)
		.map(({ direction, changes }) => ({
			direction,
			loading: changes.loading.value,
			failed: changes.failed.value,
			blocked: !!changes.blocker.value,
			changeCount: changes.changeCount.value,
			disabled:
				changes.loading.value ||
				!!changes.blocker.value ||
				(!changes.failed.value && changes.changeCount.value === 0),
			label: changes.loading.value
				? i18n.baseText(`promotions.preview.badge.loading.${direction}`)
				: changes.failed.value
					? i18n.baseText(`promotions.preview.badge.failed.${direction}`)
					: changes.blocker.value
						? i18n.baseText('promotions.preview.badge.blocked.promote')
						: changes.changeCount.value === 0
							? i18n.baseText(`promotions.preview.badge.empty.${direction}`)
							: i18n.baseText(`promotions.preview.badge.${direction}`, {
									adjustToNumber: changes.changeCount.value,
									interpolate: {
										count: String(changes.changeCount.value),
										environment:
											environments.value.find((environment) => environment.direction === direction)
												?.name ?? '',
									},
								}),
			to: { name: PROMOTION_PREVIEW_VIEWS[direction], params: { projectId } },
		}));
});
</script>

<template>
	<div v-if="badges.length > 0" :class="$style.badges" data-test-id="promotion-preview-badges">
		<N8nTooltip
			v-for="badge in badges"
			:key="badge.direction"
			:content="badge.label"
			:disabled="badge.loading"
			as-child
		>
			<span
				v-if="badge.blocked"
				role="button"
				tabindex="0"
				aria-disabled="true"
				:aria-label="badge.label"
				:class="[$style.link, $style.blocked]"
				:data-test-id="`promotion-preview-badge-${badge.direction}`"
			>
				<N8nBadge
					:class="$style.inert"
					variant="subtle"
					size="xsmall"
					:leading-icon="ICONS[badge.direction]"
					clickable
					disabled
					aria-hidden="true"
				/>
			</span>
			<component
				:is="badge.disabled ? 'span' : RouterLink"
				v-else
				v-bind="badge.disabled ? {} : { to: badge.to }"
				:role="badge.loading ? 'status' : undefined"
				:aria-label="badge.label"
				:aria-busy="badge.loading || undefined"
				:aria-disabled="badge.disabled || undefined"
				:class="[$style.link, { [$style.disabled]: badge.disabled }]"
				:data-test-id="`promotion-preview-badge-${badge.direction}`"
			>
				<N8nBadge
					:variant="badge.failed ? 'warning' : 'subtle'"
					size="xsmall"
					:leading-icon="ICONS[badge.direction]"
				>
					<span :class="$style.count">
						<N8nIcon v-if="badge.loading" icon="loader-circle" size="small" spin />
						<template v-else>{{ badge.failed ? '?' : badge.changeCount }}</template>
					</span>
				</N8nBadge>
			</component>
		</N8nTooltip>
	</div>
</template>

<style module lang="scss">
.badges {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	/* Keep the count at least as wide as the small loading icon. */
	min-width: var(--spacing--xs);
	font-variant-numeric: tabular-nums;
}

.link {
	display: inline-flex;
	/* Match the badge radius so the focus ring follows its shape. */
	border-radius: var(--radius--xs);

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--focus--border-width);
	}
}

.disabled {
	cursor: default;

	:global(.n8n-badge) {
		--n8n-badge--text-color: var(--text-color--disabled);
	}
}

.blocked {
	cursor: not-allowed;
}

/* The wrapper receives hover events from the disabled badge. */
.inert {
	pointer-events: none;
}
</style>
