<template>
	<div
		:class="{
			[$style.creatorNode]: true,
			[$style.hasAction]: !showActionArrow,
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
				<font-awesome-icon icon="bolt" v-if="isTrigger" size="xs" :class="$style.triggerIcon" />
				<n8n-tooltip
					v-if="!!$slots.tooltip"
					placement="top"
					data-test-id="node-creator-item-tooltip"
				>
					<template #content>
						<slot name="tooltip" />
					</template>
					<n8n-icon :class="$style.tooltipIcon" icon="cube" />
				</n8n-tooltip>
			</div>
			<p :class="$style.description" v-if="description" v-text="description" />
		</div>
		<slot name="dragContent" />
		<button :class="$style.panelIcon" v-if="showActionArrow">
			<font-awesome-icon :class="$style.panelArrow" icon="arrow-right" />
		</button>
	</div>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import N8nTooltip from '../N8nTooltip';

export interface Props {
	active?: boolean;
	isTrigger?: boolean;
	description?: string;
	title: string;
	showActionArrow?: boolean;
}

defineProps<Props>();

defineEmits<{
	(event: 'tooltipClick', $e: MouseEvent): void;
}>();
</script>

<style lang="scss" module>
.creatorNode {
	display: flex;
	align-items: center;
	cursor: pointer;
	z-index: 1;
	padding: var(--spacing-xs) var(--spacing-2xs) var(--spacing-xs) 0;

	&.hasAction {
		user-select: none;
	}
}
.creatorNode:hover .panelIcon {
	color: var(--action-arrow-color-hover, var(--color-text-light));
}

.panelIcon {
	flex-grow: 1;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-left: var(--spacing-2xs);
	color: var(--action-arrow-color, var(--color-text-lighter));
	cursor: pointer;
	background: transparent;
	border: none;
}
.tooltipIcon {
	margin-left: var(--spacing-3xs);
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
	color: var(--node-creator-description-colos, var(--color-text-base));
}

.triggerIcon {
	margin-left: var(--spacing-3xs);
	color: var(--color-primary);
}
</style>

<style lang="scss" scoped>
.el-tooltip svg {
	color: var(--color-foreground-xdark);
}
</style>
