<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useResourceCenterStore } from '../stores/resourceCenter.store';
import { useSidebarLayout } from '@/app/composables/useSidebarLayout';

const resourceCenterStore = useResourceCenterStore();
const { isCollapsed } = useSidebarLayout();
const {
	markResourceCenterTooltipDismissed,
	trackResourceCenterTooltipView,
	trackResourceCenterTooltipDismiss,
} = resourceCenterStore;
const locale = useI18n();

const tooltipRef = ref<HTMLElement>();
const isVisible = ref(false);
const position = ref({ top: 0, left: 0 });
const tooltipKey = ref(0);

const shouldShow = computed(() => resourceCenterStore.shouldShowResourceCenterTooltip);

const tooltipText = computed(() => {
	return locale.baseText('experiments.resourceCenter.tooltip.text');
});

const calculatePosition = () => {
	const resourceCenterElement = document.querySelector(
		'[data-test-id="menu-item"][id="resource-center"]',
	);
	if (!resourceCenterElement) return;

	const menuRect = resourceCenterElement.getBoundingClientRect();

	position.value = {
		top: menuRect.top + menuRect.height / 2 - 5,
		left: menuRect.right,
	};

	tooltipKey.value++;
};

const showTooltip = async () => {
	isVisible.value = true;
	trackResourceCenterTooltipView();
	await nextTick();
	calculatePosition();
};

const hideTooltip = () => {
	isVisible.value = false;
};

const handleDismiss = () => {
	trackResourceCenterTooltipDismiss();
	markResourceCenterTooltipDismissed();
	hideTooltip();
};

const handleResize = () => {
	if (isVisible.value) {
		calculatePosition();
	}
};

const handleContentResize = () => {
	if (isVisible.value) {
		setTimeout(() => {
			calculatePosition();
		}, 500);
	}
};

watch(
	shouldShow,
	async (newValue) => {
		if (newValue) {
			await showTooltip();
		} else {
			hideTooltip();
		}
	},
	{ immediate: true },
);

// Recalculate position when sidebar collapse state changes
watch(isCollapsed, async () => {
	if (isVisible.value) {
		await nextTick();
		// Small delay to allow sidebar animation to complete
		setTimeout(() => {
			calculatePosition();
		}, 300);
	}
});

let contentResizeObserver: ResizeObserver | null = null;

onMounted(() => {
	window.addEventListener('resize', handleResize);
	window.addEventListener('scroll', handleResize);

	const contentElement = document.getElementById('content');
	if (contentElement) {
		contentResizeObserver = new ResizeObserver(handleContentResize);
		contentResizeObserver.observe(contentElement);
	}
});

onUnmounted(() => {
	window.removeEventListener('resize', handleResize);
	window.removeEventListener('scroll', handleResize);

	if (contentResizeObserver) {
		contentResizeObserver.disconnect();
		contentResizeObserver = null;
	}
});
</script>

<template>
	<Teleport to="body">
		<div
			v-if="isVisible && shouldShow"
			ref="tooltipRef"
			:key="tooltipKey"
			:class="$style.triggerContainer"
			:style="{
				position: 'fixed',
				top: position.top + 'px',
				left: position.left + 'px',
			}"
		>
			<N8nTooltip
				:visible="true"
				placement="right"
				:show-arrow="true"
				:popper-style="{ maxWidth: '260px', minWidth: '240px' }"
			>
				<template #content>
					<div :class="$style.tooltipContent">
						<span :class="$style.text">
							{{ tooltipText }}
						</span>
						<button
							:class="$style.dismissButton"
							type="button"
							aria-label="Dismiss tooltip"
							@click="handleDismiss"
						>
							<N8nIcon icon="x" size="small" />
						</button>
					</div>
				</template>
				<div :class="$style.tooltipTrigger"></div>
			</N8nTooltip>
		</div>
	</Teleport>
</template>

<style lang="scss" module>
.triggerContainer {
	z-index: 9999;
	pointer-events: auto;
}

.tooltipTrigger {
	width: 1px;
	height: 1px;
	opacity: 0;
}

.tooltipContent {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.text {
	flex: 1;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

.dismissButton {
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	color: var(--color--text--tint-1);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	flex-shrink: 0;

	&:hover {
		color: var(--color--text);
	}
}
</style>
