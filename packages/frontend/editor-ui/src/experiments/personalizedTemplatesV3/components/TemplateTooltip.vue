<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { usePersonalizedTemplatesV3Store } from '../stores/personalizedTemplatesV3.store';

const personalizedTemplatesV3Store = usePersonalizedTemplatesV3Store();
const {
	markTemplateRecommendationInteraction,
	trackPersonalizationTooltipView,
	trackPersonalizationTooltipDismiss,
} = personalizedTemplatesV3Store;
const locale = useI18n();

const tooltipRef = ref<HTMLElement>();
const isVisible = ref(false);
const position = ref({ top: 0, left: 0 });
const tooltipKey = ref(0);

const shouldShow = computed(() => personalizedTemplatesV3Store.shouldShowTemplateTooltip);

const calculatePosition = () => {
	const templatesElement = document.querySelector('[data-test-id="menu-item"][id="templates"]');
	if (!templatesElement) return;

	const menuRect = templatesElement.getBoundingClientRect();

	position.value = {
		top: menuRect.top + menuRect.height / 2 - 5,
		left: menuRect.right,
	};

	tooltipKey.value++;
};

const showTooltip = async () => {
	isVisible.value = true;
	trackPersonalizationTooltipView();
	await nextTick();
	calculatePosition();
};

const hideTooltip = () => {
	isVisible.value = false;
};

const handleDismiss = () => {
	trackPersonalizationTooltipDismiss();
	markTemplateRecommendationInteraction();
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

	// Clean up content resize observer
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
							{{ locale.baseText('experiments.personalizedTemplatesV3.recommendationTooltip') }}
						</span>
						<button
							:class="$style.dismissButton"
							type="button"
							@click="handleDismiss"
							:aria-label="'Dismiss tooltip'"
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
