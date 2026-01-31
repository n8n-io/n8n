<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { getNodeIconSource, type NodeIconSource } from '@/app/utils/nodeIcon';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { AppInfo } from '../composables/useAppCredentials';

type CardState = 'default' | 'loading' | 'connected' | 'error';

const props = defineProps<{
	app?: AppInfo;
	state?: CardState;
	supportsInstantOAuth?: boolean;
	skeleton?: boolean;
}>();

const emit = defineEmits<{
	click: [];
}>();

const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();

const isClickable = computed(
	() => !props.skeleton && (props.state === 'default' || props.state === 'error'),
);

const handleClick = () => {
	if (isClickable.value) {
		emit('click');
	}
};

// Get the appropriate icon based on current theme
const getThemedIcon = (app: AppInfo): string | undefined => {
	const isDark = uiStore.appliedTheme === 'dark';
	// Prefer dark icon in dark mode if available
	if (isDark && app.iconDark) {
		return app.iconDark;
	}
	return app.icon;
};

// Build icon source from app info
// Try to get the full node type from store for proper icon resolution
const iconSource = computed((): NodeIconSource | undefined => {
	const { app } = props;
	if (!app) return undefined;

	// Try to get the node type from the store using the app name
	// This gives us access to iconBasePath for file: icons and proper theme handling
	const nodeType = nodeTypesStore.getNodeType(app.name);
	if (nodeType) {
		return getNodeIconSource(nodeType);
	}

	// Fallback: use app icon data with theme awareness
	const icon = getThemedIcon(app);
	if (icon?.startsWith('fa:')) {
		return { type: 'icon', name: icon.replace('fa:', '') };
	}

	return undefined;
});
</script>

<template>
	<!-- Skeleton state -->
	<div
		v-if="skeleton"
		:class="[$style.card, $style.skeleton]"
		data-test-id="app-selection-card-skeleton"
	>
		<div :class="$style.iconContainer">
			<div :class="$style.skeletonIcon" />
		</div>
		<div :class="$style.skeletonText" />
	</div>

	<!-- Normal state -->
	<div
		v-else
		:class="[
			$style.card,
			{
				[$style.clickable]: isClickable,
				[$style.connected]: state === 'connected',
				[$style.error]: state === 'error',
				[$style.loading]: state === 'loading',
			},
		]"
		:data-test-id="`app-selection-card-${app?.name}`"
		role="button"
		:tabindex="isClickable ? 0 : -1"
		@click="handleClick"
		@keydown.enter="handleClick"
		@keydown.space.prevent="handleClick"
	>
		<Transition name="fade">
			<div v-if="state === 'connected'" :class="$style.connectedBadge">
				<N8nIcon icon="check" :class="$style.badgeIcon" />
			</div>
		</Transition>

		<div :class="$style.iconContainer">
			<NodeIcon :icon-source="iconSource" :size="32" :class="$style.icon" />
		</div>

		<N8nText :class="$style.name" size="small">
			{{ app?.displayName }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.card {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding: var(--spacing--xs);
	padding-top: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	width: 140px;
	height: 110px;
	transition: all 0.2s ease;
	cursor: default;
	user-select: none;

	&.clickable {
		cursor: pointer;

		&:hover {
			border-color: var(--color--primary);
			background-color: var(--color--background--light-2);
		}

		&:focus {
			outline: 2px solid var(--color--primary);
			outline-offset: 2px;
		}
	}

	&.connected {
		border-color: var(--color--success);
		border-width: 2px;
	}

	&.error {
		border-color: var(--color--danger);

		&:hover {
			background-color: var(--color--danger--tint-4);
		}
	}

	&.loading {
		cursor: wait;
	}

	&.skeleton {
		cursor: default;
	}
}

@keyframes skeleton-pulse {
	0%,
	100% {
		opacity: 0.6;
	}
	50% {
		opacity: 0.3;
	}
}

.skeletonIcon {
	width: 32px;
	height: 32px;
	border-radius: var(--radius);
	background: var(--color--foreground);
	animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeletonText {
	width: 80px;
	height: 14px;
	border-radius: var(--radius--sm);
	background: var(--color--foreground);
	animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.iconContainer {
	position: relative;
	width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: var(--spacing--2xs);
}

.icon {
	width: 32px;
	height: 32px;
	object-fit: contain;
}

.connectedBadge {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--success);
	border-radius: 50%;
}

.badgeIcon {
	color: white;
	font-size: 12px;
}

.name {
	text-align: center;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	line-height: 1.3;
	max-width: 100%;
	word-break: break-word;
}
</style>

<style>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
