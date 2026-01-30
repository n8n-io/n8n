<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nSpinner, N8nText, N8nTooltip } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { getNodeIconSource, type NodeIconSource } from '@/app/utils/nodeIcon';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { AppInfo } from '../composables/useAppCredentials';

type CardState = 'default' | 'loading' | 'connected' | 'error';

const props = defineProps<{
	app: AppInfo;
	state: CardState;
	supportsInstantOAuth: boolean;
}>();

const emit = defineEmits<{
	click: [];
}>();

const nodeTypesStore = useNodeTypesStore();

const isClickable = computed(() => props.state === 'default' || props.state === 'error');

const handleClick = () => {
	if (isClickable.value) {
		emit('click');
	}
};

// Build icon source from app info
// Try to get the full node type from store for proper icon resolution
const iconSource = computed((): NodeIconSource | undefined => {
	const { app } = props;

	// Try to get the node type from the store using the app name
	// This gives us access to iconBasePath for file: icons
	const nodeType = nodeTypesStore.getNodeType(app.name);
	if (nodeType) {
		return getNodeIconSource(nodeType);
	}

	// Fallback: handle FontAwesome icons directly from API data
	if (app.icon?.startsWith('fa:')) {
		return { type: 'icon', name: app.icon.replace('fa:', '') };
	}

	return undefined;
});
</script>

<template>
	<div
		:class="[
			$style.card,
			{
				[$style.clickable]: isClickable,
				[$style.connected]: state === 'connected',
				[$style.error]: state === 'error',
				[$style.loading]: state === 'loading',
			},
		]"
		:data-test-id="`app-selection-card-${app.name}`"
		role="button"
		:tabindex="isClickable ? 0 : -1"
		@click="handleClick"
		@keydown.enter="handleClick"
		@keydown.space.prevent="handleClick"
	>
		<div :class="$style.iconContainer">
			<NodeIcon :icon-source="iconSource" :size="32" :class="$style.icon" />

			<Transition name="fade">
				<div v-if="state === 'loading'" :class="$style.overlay">
					<N8nSpinner :class="$style.spinner" />
				</div>
			</Transition>

			<Transition name="fade">
				<div v-if="state === 'connected'" :class="$style.overlaySuccess">
					<N8nIcon icon="circle-check" :class="$style.checkIcon" />
				</div>
			</Transition>

			<Transition name="fade">
				<div v-if="state === 'error'" :class="$style.overlay">
					<N8nIcon icon="triangle-alert" :class="$style.errorIcon" />
				</div>
			</Transition>

			<N8nTooltip
				v-if="supportsInstantOAuth && state === 'default'"
				content="Instant connect"
				placement="top"
			>
				<div :class="$style.instantBadge">
					<N8nIcon icon="zap" :class="$style.boltIcon" />
				</div>
			</N8nTooltip>
		</div>

		<N8nText :class="$style.name" size="small">
			{{ app.displayName }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding: var(--spacing--sm);
	padding-top: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background: var(--color--background);
	width: 140px;
	height: 110px;
	transition: all 0.2s ease;
	cursor: default;
	user-select: none;

	&.clickable {
		cursor: pointer;

		&:hover {
			border-color: var(--color--primary);
			background: var(--color--background--shade-1);
		}

		&:focus {
			outline: 2px solid var(--color--primary);
			outline-offset: 2px;
		}
	}

	&.connected {
		border-color: var(--color--success);
		background: var(--color--success--tint-3);
	}

	&.error {
		border-color: var(--color--danger);

		&:hover {
			background: var(--color--danger--tint-4);
		}
	}

	&.loading {
		cursor: wait;
	}
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

.overlay {
	position: absolute;
	inset: -4px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, 0.9);
	border-radius: var(--radius);
}

.overlaySuccess {
	position: absolute;
	inset: -4px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--success--tint-3);
	border-radius: var(--radius);
}

.spinner {
	width: 24px;
	height: 24px;
}

.checkIcon {
	color: var(--color--success);
	font-size: 24px;
}

.errorIcon {
	color: var(--color--danger);
	font-size: 20px;
}

.instantBadge {
	position: absolute;
	top: -6px;
	right: -6px;
	width: 18px;
	height: 18px;
	background: var(--color--warning);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.boltIcon {
	color: var(--color--text--shade-1);
	font-size: 10px;
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
