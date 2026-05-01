<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { removePreviewToken } from '@/features/shared/nodeCreator/nodeCreator.utils';
import type { AppInfo } from '../composables/useAppCredentials';
import type { SimplifiedNodeType } from '@/Interface';
import type { Icon, ThemeIconColor } from 'n8n-workflow';

type CardState = 'default' | 'loading' | 'connected' | 'error';

const props = defineProps<{
	app?: AppInfo;
	state?: CardState;
	supportsInstantOAuth?: boolean;
	skeleton?: boolean;
	installed?: boolean;
	showWarning?: boolean;
	showBadge?: boolean;
	isOwner?: boolean;
}>();

const emit = defineEmits<{
	click: [];
}>();

const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();

const isInstalled = computed(() => props.installed);

const installBadgeTooltip = computed(() => {
	if (props.isOwner) {
		return i18n.baseText('credentialsAppSelection.installToConnect');
	}

	return i18n.baseText('credentialsAppSelection.askAdminToInstall');
});

const isClickable = computed(
	() =>
		!props.skeleton &&
		(props.state === 'default' ||
			props.state === 'error' ||
			props.state === 'connected' ||
			props.state === undefined),
);

const handleClick = () => {
	if (isClickable.value) {
		emit('click');
	}
};

const nodeTypeForIcon = computed((): SimplifiedNodeType | null => {
	const { app } = props;
	if (!app) return null;

	const nodeType = nodeTypesStore.getNodeType(app.name);
	if (nodeType) {
		return nodeType;
	}

	const cleanedName = removePreviewToken(app.name);
	const communityNode = nodeTypesStore.communityNodeType(cleanedName);

	if (communityNode?.nodeDescription) {
		return communityNode.nodeDescription;
	}

	if (app.iconUrl || app.icon) {
		const fallback: SimplifiedNodeType = {
			name: app.name,
			displayName: app.displayName,
			iconUrl: app.iconUrl,
			icon: app.icon as Icon | undefined,
			iconColor: app.iconColor as ThemeIconColor | undefined,
			group: [],
			outputs: [],
			defaults: { name: app.displayName },
			description: '',
		};
		return fallback;
	}

	return null;
});
</script>

<template>
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

	<div
		v-else
		:class="[
			$style.card,
			{
				[$style.clickable]: isClickable,
				[$style.connected]: state === 'connected' && !showWarning,
				[$style.warning]: state === 'connected' && showWarning,
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
			<div
				v-if="showBadge && showWarning && state === 'connected'"
				:class="$style.warningBadgeWrapper"
			>
				<N8nTooltip placement="top" :show-after="300">
					<template #content>
						{{ i18n.baseText('credentialsAppSelection.credentialsNotValid') }}
					</template>
					<div :class="$style.warningBadge">
						<N8nIcon icon="triangle-alert" :class="$style.badgeIcon" />
					</div>
				</N8nTooltip>
			</div>
			<div v-else-if="showBadge && state === 'connected'" :class="$style.connectedBadge">
				<N8nIcon icon="check" :class="$style.badgeIcon" />
			</div>
		</Transition>

		<div v-if="!isInstalled" :class="$style.installBadgeWrapper">
			<N8nTooltip placement="top" :show-after="300">
				<template #content>
					{{ installBadgeTooltip }}
				</template>
				<div :class="$style.installBadge">
					<N8nIcon icon="download" :class="$style.installBadgeIcon" />
				</div>
			</N8nTooltip>
		</div>

		<div :class="$style.iconContainer">
			<NodeIcon :node-type="nodeTypeForIcon" :size="32" :class="$style.icon" />
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
	border: 2px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	width: 140px;
	height: 110px;
	transition: all 0.2s ease;
	cursor: default;
	user-select: none;

	&.clickable {
		cursor: pointer;

		&:hover,
		&:focus-visible {
			border-color: var(--color--primary);
			background-color: var(--color--background--light-2);
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
			outline: none;
		}
	}

	&.connected {
		border: 2px solid var(--color--success);
		cursor: pointer;

		&:hover,
		&:focus-visible {
			border-color: var(--color--primary);
			background-color: var(--color--background--light-2);
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
			outline: none;
		}
	}

	&.warning {
		border: 2px solid var(--color--warning);
		cursor: pointer;

		&:hover,
		&:focus-visible {
			border-color: var(--color--primary);
			background-color: var(--color--background--light-2);
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
			outline: none;
		}
	}

	&.error {
		border-color: var(--color--danger);

		&:hover,
		&:focus-visible {
			background-color: var(--color--danger--tint-4);
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
		}
	}

	&.loading {
		cursor: wait;
		border-color: var(--color--primary);
		background-color: var(--color--background--light-2);
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

	:deep(img) {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
}

.icon {
	width: 32px;
	height: 32px;
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

.warningBadgeWrapper {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	z-index: 1;
}

.warningBadge {
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;

	.badgeIcon {
		color: var(--color--warning);
		font-size: 16px;
	}
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

.installBadgeWrapper {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	z-index: 1;
}

.installBadge {
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--foreground);
	border-radius: 50%;
}

.installBadgeIcon {
	color: var(--color--text--tint-1);
	font-size: 10px;
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
