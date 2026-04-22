<script lang="ts" setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { N8nIcon, N8nMenuItem, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useFavoriteNavItems } from '../composables/useFavoriteNavItems';

const locale = useI18n();
const favoritesStore = useFavoritesStore();

const {
	favoriteGroups,
	activeTabId,
	onFavoriteProjectClick,
	onFavoriteWorkflowClick,
	onUnpinFavorite,
} = useFavoriteNavItems();

const isActive = computed(() =>
	favoriteGroups.value.some((group) =>
		group.items.some((entry) => entry.menuItem.id === activeTabId.value),
	),
);

const show = ref(false);
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function onMouseEnter() {
	if (closeTimer !== null) {
		clearTimeout(closeTimer);
		closeTimer = null;
	}
	show.value = true;
}

function onMouseLeave() {
	closeTimer = setTimeout(() => {
		show.value = false;
	}, 150);
}

onBeforeUnmount(() => {
	if (closeTimer !== null) clearTimeout(closeTimer);
});

const hasFavorites = computed(() => favoritesStore.favorites.length > 0);
</script>

<template>
	<N8nPopover
		v-if="hasFavorites"
		side="right"
		align="start"
		:side-offset="8"
		:open="show"
		width="220px"
		:suppress-auto-focus="true"
		@update:open="show = $event"
	>
		<template #trigger>
			<div
				:class="[$style.trigger, isActive && $style.triggerActive]"
				@mouseenter="onMouseEnter"
				@mouseleave="onMouseLeave"
			>
				<N8nIcon icon="star" size="medium" />
			</div>
		</template>
		<template #content>
			<div :class="$style.content" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
				<N8nText :class="$style.title" size="small" bold color="text-light">
					{{ locale.baseText('favorites.menu.title') }}
				</N8nText>
				<template v-for="(group, groupIndex) in favoriteGroups" :key="group.type">
					<div v-if="groupIndex > 0" :class="$style.groupSpacer" />
					<template v-for="entry in group.items" :key="entry.menuItem.id">
						<div
							:class="$style.favoriteItem"
							@click="
								group.type === 'project'
									? onFavoriteProjectClick(entry.resourceId)
									: group.type === 'workflow'
										? onFavoriteWorkflowClick()
										: undefined
							"
						>
							<N8nMenuItem
								:item="entry.menuItem"
								:compact="false"
								:active="activeTabId === entry.menuItem.id"
							/>
							<button
								:class="$style.unpinButton"
								:aria-label="locale.baseText('favorites.remove')"
								data-test-id="favorite-unpin-button"
								@click.stop.prevent="onUnpinFavorite(entry.resourceId, entry.resourceType)"
							>
								<N8nIcon icon="x" size="small" />
							</button>
						</div>
					</template>
				</template>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.trigger {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	cursor: pointer;
	width: 100%;
	color: var(--color--text--tint-1);
}

.triggerActive {
	color: var(--color--text--shade-1);
}

.content {
	padding: var(--spacing--3xs);
}

.title {
	display: block;
	padding: 0 var(--spacing--xs);
	margin-bottom: var(--spacing--4xs);
}

.groupSpacer {
	height: var(--spacing--4xs);
}

.favoriteItem {
	position: relative;

	&:hover .unpinButton,
	.unpinButton:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}

	&:hover a[role='menuitem'] {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
	}
}

.unpinButton {
	position: absolute;
	right: var(--spacing--4xs);
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--5xs);
	background: none;
	border: none;
	color: var(--color--text--tint-2);
	cursor: pointer;
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.15s ease;

	&:hover,
	&:focus-visible {
		color: var(--color--text);
	}
}
</style>
