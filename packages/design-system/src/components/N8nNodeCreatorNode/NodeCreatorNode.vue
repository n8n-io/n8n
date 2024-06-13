<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import type { NodeCreatorTag } from '../../types/node-creator-node';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import N8nTooltip from '../N8nTooltip';
import { ElTag } from 'element-plus';

export interface Props {
	active?: boolean;
	isAi?: boolean;
	isTrigger?: boolean;
	description?: string;
	tag?: NodeCreatorTag;
	title: string;
	showActionArrow?: boolean;
}

defineProps<Props>();

defineEmits<{
	(event: 'tooltipClick', $e: MouseEvent): void;
}>();

const { t } = useI18n();
</script>

<template>
	<div
		:class="{
			[$style.creatorNode]: true,
			[$style.hasAction]: !showActionArrow,
		}"
		v-bind="$attrs"
	>
		<div :class="$style.nodeIcon">
			<slot name="icon" />
		</div>
		<div>
			<div :class="$style.details">
				<span :class="$style.name" data-test-id="node-creator-item-name" v-text="title" />
				<ElTag v-if="tag" :class="$style.tag" size="small" round :type="tag.type ?? 'success'">
					{{ tag.text }}
				</ElTag>
				<FontAwesomeIcon
					v-if="isTrigger"
					icon="bolt"
					size="xs"
					:title="t('nodeCreator.nodeItem.triggerIconTitle')"
					:class="$style.triggerIcon"
				/>
				<N8nTooltip
					v-if="!!$slots.tooltip"
					placement="top"
					data-test-id="node-creator-item-tooltip"
				>
					<template #content>
						<slot name="tooltip" />
					</template>
					<n8n-icon :class="$style.tooltipIcon" icon="cube" />
				</N8nTooltip>
			</div>
			<p
				v-if="description"
				data-test-id="node-creator-item-description"
				:class="$style.description"
				v-text="description"
			/>
		</div>
		<slot name="dragContent" />
		<button v-if="showActionArrow" :class="$style.panelIcon">
			<FontAwesomeIcon :class="$style.panelArrow" icon="arrow-right" />
		</button>
	</div>
</template>

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
:root .tag {
	margin-left: var(--spacing-2xs);
	line-height: var(--font-size-3xs);
	font-size: var(--font-size-3xs);
	padding: 0.1875rem var(--spacing-3xs) var(--spacing-4xs) var(--spacing-3xs);
	height: auto;

	span {
		font-size: var(--font-size-2xs) !important;
	}
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
	margin-right: var(--node-icon-margin-right, var(--spacing-s));
}
.name {
	font-weight: var(--node-creator-name-weight, var(--font-weight-bold));
	font-size: var(--node-creator-name-size, var(--font-size-s));
	line-height: 1.115rem;
}
.description {
	margin-top: var(--spacing-5xs);
	font-size: var(--font-size-2xs);
	line-height: 1rem;
	font-weight: 400;
	color: var(--node-creator-description-colos, var(--color-text-base));
}

.aiIcon {
	margin-left: var(--spacing-3xs);
	color: var(--color-secondary);
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
