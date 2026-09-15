<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { CollapsibleRoot } from 'reka-ui';
import { computed, nextTick, onScopeDispose, ref, useId, useTemplateRef, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nAnimatedCollapsibleContent from '../N8nAnimatedCollapsibleContent';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import type { SetupPanelProps } from './SetupPanel.types';

const props = defineProps<SetupPanelProps>();
const emit = defineEmits<{
	'update:activeItemId': [id: string | undefined];
	detailClosed: [];
	execute: [];
}>();
const { t } = useI18n();
const activeItem = computed(() =>
	props.items.find((item) => item.id === props.activeItemId && !item.disabled),
);
const panel = useTemplateRef<HTMLElement>('panel');
const overlay = useTemplateRef<HTMLElement>('overlay');
const overlayContent = useTemplateRef<HTMLElement>('overlayContent');
const overlayHeight = ref<number>();
const animateHeight = ref(false);
let resizeFrame: number | undefined;

function measureOverlay() {
	if (activeItem.value && overlayContent.value)
		overlayHeight.value = overlayContent.value.offsetHeight;
}
useResizeObserver(overlayContent, measureOverlay);
watch(
	() => activeItem.value?.id,
	async (id) => {
		if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
		if (!id) return;
		// A different item starts at its own height; only changes within it resize smoothly.
		animateHeight.value = false;
		overlayHeight.value = undefined;
		await nextTick();
		if (activeItem.value?.id !== id || !overlayContent.value) return;
		measureOverlay();
		resizeFrame = requestAnimationFrame(() => {
			animateHeight.value = true;
		});
	},
	{ immediate: true, flush: 'post' },
);
onScopeDispose(() => {
	if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
});

function deactivateOverlay(element: Element) {
	element.setAttribute('inert', '');
	element.setAttribute('aria-hidden', 'true');
}
function activateOverlay(element: Element) {
	element.removeAttribute('inert');
	element.removeAttribute('aria-hidden');
}
const titleId = useId();
const expanded = ref(false);
const showTerminal = computed(() => props.status && props.status !== 'incomplete');
const showChecklist = computed(
	() => Boolean(activeItem.value) || !showTerminal.value || expanded.value,
);
const checklistId = useId();
watch(
	() => props.status,
	(status) => {
		if (status !== 'complete' && status !== 'executing') return;
		if (!activeItem.value || status === 'executing') expanded.value = false;
		if (status === 'executing' && props.activeItemId) emit('update:activeItemId', undefined);
	},
);
watch(
	() => activeItem.value?.id,
	async (id, previousId) => {
		await nextTick();
		if (id) overlay.value?.querySelector<HTMLButtonElement>('button')?.focus();
		else if (previousId) {
			if (!showChecklist.value) {
				panel.value
					?.querySelector<HTMLButtonElement>('[data-test-id="setup-panel-review"]')
					?.focus();
				return;
			}
			Array.from(
				panel.value?.querySelectorAll<HTMLButtonElement>('button[data-setup-item-id]') ?? [],
			)
				.find((button) => button.dataset.setupItemId === previousId)
				?.focus();
		}
	},
);
</script>

<template>
	<section
		v-if="items.length"
		ref="panel"
		:class="$style.panel"
		:aria-label="t('setupPanel.label')"
	>
		<div :class="[$style.base, { [$style.hidden]: activeItem }]">
			<div
				v-if="showTerminal"
				:class="$style.terminal"
				:inert="Boolean(activeItem && showChecklist)"
				:aria-hidden="activeItem && showChecklist ? true : undefined"
				data-test-id="setup-panel-terminal"
			>
				<span v-if="status !== 'complete'" :class="$style.status" role="status">
					<N8nIcon icon="loader-circle" size="small" :class="$style.spinner" />
					{{ t(status === 'executing' ? 'setupPanel.executing' : 'setupPanel.validating') }}
				</span>
				<template v-else>
					<N8nButton
						variant="ghost"
						size="small"
						:class="$style.review"
						data-test-id="setup-panel-review"
						:aria-expanded="expanded"
						:aria-controls="checklistId"
						@click="
							expanded = !expanded;
							emit('update:activeItemId', undefined);
						"
					>
						{{ t('setupPanel.setupComplete') }}
						<N8nIcon :icon="expanded ? 'chevron-down' : 'chevron-right'" size="small" />
					</N8nButton>
					<N8nButton size="small" :disabled="executeDisabled" @click="emit('execute')">
						{{ t('setupPanel.execute') }}
					</N8nButton>
				</template>
			</div>
			<CollapsibleRoot :open="showChecklist" :unmount-on-hide="false">
				<N8nAnimatedCollapsibleContent>
					<div :class="{ [$style.listSpacing]: showTerminal }">
						<ul
							:id="checklistId"
							:class="$style.rows"
							:inert="Boolean(activeItem) || !showChecklist"
							:aria-hidden="activeItem || !showChecklist ? true : undefined"
						>
							<li v-for="item in items" :key="item.id">
								<component
									:is="item.hasAction ? 'div' : 'button'"
									:role="item.hasAction ? 'group' : undefined"
									:aria-label="item.hasAction ? item.title : undefined"
									:type="item.hasAction ? undefined : 'button'"
									:class="[$style.row, { [$style.actionRow]: item.hasAction }]"
									:disabled="item.hasAction ? undefined : item.disabled"
									data-test-id="setup-panel-row"
									:data-setup-item-id="item.id"
									@click="!item.hasAction && emit('update:activeItemId', item.id)"
								>
									<span :class="$style.icon">
										<N8nIcon
											v-if="item.completed"
											icon="status-completed"
											size="large"
											color="success"
										/>
										<slot v-else name="icon" :item="item" />
									</span>
									<span :class="$style.title">{{ item.title }}</span>
									<slot v-if="item.hasAction" name="action" :item="item" />
									<span v-else-if="!item.completed && item.subtitle" :class="$style.subtitle">
										{{ item.subtitle }}
									</span>
									<span v-if="item.completed" :class="$style.complete">
										{{ t('setupPanel.complete') }}
									</span>
									<N8nIcon
										v-if="!item.hasAction"
										icon="chevron-right"
										size="small"
										:class="$style.chevron"
									/>
								</component>
							</li>
						</ul>
					</div>
				</N8nAnimatedCollapsibleContent>
			</CollapsibleRoot>
		</div>
		<Transition
			:enter-active-class="$style.overlayEnter"
			:leave-active-class="$style.overlayLeave"
			@before-enter="activateOverlay"
			@before-leave="deactivateOverlay"
			@leave-cancelled="activateOverlay"
			@after-leave="emit('detailClosed')"
		>
			<div
				v-if="activeItem && showChecklist"
				:key="activeItem.id"
				ref="overlay"
				:class="[$style.overlay, { [$style.resize]: animateHeight }]"
				:style="overlayHeight === undefined ? undefined : { height: `${overlayHeight}px` }"
				role="dialog"
				:aria-labelledby="titleId"
				data-test-id="setup-panel-overlay"
				@keydown.esc.stop="emit('update:activeItemId', undefined)"
			>
				<div ref="overlayContent" :class="$style.overlayContent">
					<header :class="$style.header">
						<N8nButton
							variant="ghost"
							size="small"
							icon-only
							:aria-label="t('setupPanel.back')"
							data-test-id="setup-panel-back"
							@click="emit('update:activeItemId', undefined)"
						>
							<N8nIcon icon="chevron-left" size="small" />
						</N8nButton>
						<span :class="$style.icon">
							<N8nIcon
								v-if="activeItem.completed"
								icon="status-completed"
								size="large"
								color="success"
							/>
							<slot v-else name="icon" :item="activeItem" />
						</span>
						<span :id="titleId" :class="$style.title">{{ activeItem.title }}</span>
					</header>
					<div :class="$style.detail">
						<slot name="detail" :item="activeItem" />
					</div>
				</div>
			</div>
		</Transition>
	</section>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.panel {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	min-width: 0;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	@include motion.fade-in-up;
}

.base,
.overlay {
	// Reserve the taller card's height so the chat can scroll above it.
	grid-area: 1 / 1;
	align-self: end;
}

.base {
	transform-origin: bottom center;
	transition:
		transform var(--duration--snappy) var(--easing--ease-out),
		opacity var(--duration--snappy) var(--easing--ease-out),
		visibility 0s;
	@include motion.reduced-motion;
}

.hidden {
	visibility: hidden;
	opacity: 0;
	transform: scale(0.92);
	transition-delay: 0s, 0s, var(--duration--snappy);
}

.listSpacing {
	padding-top: var(--spacing--2xs);
}

.rows,
.overlay,
.terminal {
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
}

.terminal {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	min-height: var(--height--2xl);
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-inline: var(--spacing--2xs);
}

.review {
	flex: 1;
	justify-content: space-between;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.spinner {
	@include motion.spin;
}

.overlay {
	--animation--popover-in--translate-y: var(--spacing--2xs);
	--animation--popover-in--scale: 0.95;

	position: relative;
	z-index: 1;
	box-sizing: content-box;
	max-height: 60vh;
	overflow: hidden;
	transform-origin: bottom center;
}

.overlayContent {
	display: flex;
	flex-direction: column;
	max-height: 60vh;
}

.resize {
	@include motion.height-transition;
}

.overlayEnter,
.overlayLeave {
	@include motion.popover-in;
	animation-fill-mode: both;
}

.overlayLeave {
	animation-direction: reverse;
}

.header,
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
}

.header {
	border-bottom: var(--border);
	flex-shrink: 0;
}

.rows {
	list-style: none;
	margin: 0;
	padding: var(--spacing--2xs);
	max-height: 50vh;
	overflow-y: auto;
}

.row {
	width: 100%;
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: var(--text-color);
	font: inherit;
	text-align: left;
	cursor: pointer;
	min-height: var(--height--xl);

	&:hover:not(:disabled) {
		background: var(--background--hover);
	}

	&:disabled {
		cursor: default;
		color: var(--text-color--disabled);
	}
}

.actionRow {
	cursor: default;

	&:hover:not(:disabled) {
		background: none;
	}
}

.title {
	flex: 1;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.subtitle {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtler);
}

.icon {
	display: inline-flex;
	flex-shrink: 0;
}

.complete {
	color: var(--text-color--success);
}

.chevron {
	flex-shrink: 0;
	color: var(--icon-color);
}

.detail {
	min-height: 0;
	padding: var(--spacing--sm);
	overflow-y: auto;
}
</style>
