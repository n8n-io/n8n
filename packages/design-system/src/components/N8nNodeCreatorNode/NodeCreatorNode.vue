<template>
	<div
		:class="{
			[$style.creatorNode]: true,
			[$style.padingless]: padingless,
			[$style.hasPanel]: !!$slots.panel,
		}"
		v-on="$listeners"
		v-bind="$attrs"
	>
		<div :class="$style.nodeIcon">
			<slot name="icon" />
		</div>
		<div>
			<div :class="$style.details">
				<span :class="$style.name" v-text="title" data-test-id="node-creator-item-name" />
				<trigger-icon v-if="isTrigger" :class="$style.triggerIcon" />
				<n8n-tooltip v-if="!!$slots.tooltip" placement="top">
					<!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
					<p slot="content">
						<slot name="tooltip" />
					</p>
					<n8n-icon icon="cube" />
				</n8n-tooltip>
			</div>
			<p :class="$style.description" v-if="description" v-text="description" />
		</div>

		<transition name="slide-fade">
			<div :class="$style.panel" v-if="isPanelActive">
				<slot name="panel" />
			</div>
		</transition>
		<slot name="dragContent" />
		<button
			:class="{ [$style.panelIcon]: true, [$style.visible]: !!$slots.panel }"
			@click="$emit('openPanel')"
		>
			<font-awesome-icon :class="$style.panelArrow" icon="arrow-right" />
		</button>
	</div>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import TriggerIcon from './TriggerIcon.vue';
import N8nTooltip from '../N8nTooltip';

export interface Props {
	active?: boolean;
	isTrigger?: boolean;
	description?: string;
	title: string;
	isPanelActive?: boolean;
	padingless?: boolean;
}

defineProps<Props>();

defineEmits<{
	(event: 'openPanel', $e: DragEvent): void;
	(event: 'tooltipClick', $e: MouseEvent): void;
}>();
</script>

<style lang="scss">
.slide-fade-enter-active,
.slide-fade-leave-active {
	transition: all 0.3s ease;
}
.slide-fade-enter,
.slide-fade-leave-to {
	transform: translateX(100%);
}
</style>

<style lang="scss" module>
.creatorNode {
	display: flex;
	align-items: center;
	cursor: pointer;
	z-index: 1111;

	&.hasPanel {
		user-select: none;
	}
	&:not(&.padingless) {
		padding: 11px 8px 11px 0;
	}
}
.creatorNode:hover .panelIcon {
	color: var(--color-text-light);
}
.panel {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}
.panelIcon {
	opacity: 0;
	flex-grow: 1;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-left: var(--spacing-2xs);
	color: var(--color-text-lighter);
	cursor: pointer;
	background: transparent;
	border: none;

	&.visible {
		opacity: 1;
	}
}
.panelArrow {
	font-size: var(--font-size-2xs);
	width: 12px;
}
.details {
	align-items: center;
}
.nodeIcon {
	display: flex;
	margin-right: var(--spacing-s);

	& > :global(*) {
		min-width: 25px;
		max-width: 25px;
	}
}
.test {
	width: 1px;
	height: 1px;
}
.name {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
	line-height: 1.115rem;
}
.description {
	margin-top: var(--spacing-5xs);
	font-size: var(--font-size-2xs);
	line-height: 1rem;
	font-weight: 400;
	color: var(--node-creator-description-colo, var(--color-text-base));
}

.triggerIcon {
	margin-left: var(--spacing-2xs);
}

.tooltip {
	vertical-align: top;
}
</style>

<style lang="scss" scoped>
.el-tooltip svg {
	color: var(--color-foreground-xdark);
}
</style>
