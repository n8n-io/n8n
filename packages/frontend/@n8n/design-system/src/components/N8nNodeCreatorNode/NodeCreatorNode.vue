<script setup lang="ts">
import { ElTag } from 'element-plus';

import { useI18n } from '../../composables/useI18n';
import type { NodeCreatorTag } from '../../types/node-creator-node';
import N8nIcon from '../N8nIcon';

export interface Props {
	active?: boolean;
	isAi?: boolean;
	isTrigger?: boolean;
	description?: string;
	tag?: NodeCreatorTag;
	title: string;
	showActionArrow?: boolean;
	isOfficial?: boolean;
}

defineProps<Props>();

defineEmits<{
	tooltipClick: [e: MouseEvent];
}>();

defineSlots<{ icon: {}; extraDetails: {}; dragContent: {} }>();

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
		<div>
			<div :class="$style.details">
				<div :class="$style.nodeIcon">
					<slot name="icon" />
				</div>
				<span :class="$style.name" data-test-id="node-creator-item-name" v-text="title" />
				<ElTag v-if="tag" :class="$style.tag" size="small" round :type="tag.type ?? 'success'">
					{{ tag.text }}
				</ElTag>
				<N8nIcon
					v-if="isTrigger"
					icon="bolt-filled"
					size="xsmall"
					:title="t('nodeCreator.nodeItem.triggerIconTitle')"
					:class="$style.triggerIcon"
				/>

				<slot name="extraDetails" />
			</div>
		</div>
		<slot name="dragContent" />
		<button v-if="showActionArrow" :class="$style.panelIcon">
			<N8nIcon icon="arrow-right" size="small" />
		</button>
	</div>
</template>

<style lang="scss" module>
.creatorNode {
	display: flex;
	align-items: center;
	cursor: pointer;
	z-index: 1;
	padding: var(--spacing-3xs) var(--spacing-4xs);
	border-radius: var(--radius-base);

	&.hasAction {
		user-select: none;
	}
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
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}
.details {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}
.nodeIcon {
	display: flex;
}

.nodeIcon svg,
.nodeIcon img {
	width: 14px;
	height: 14px;
}

.name {
	font-weight: var(--node-creator-name-weight, var(--font-weight-medium));
	font-size: var(--node-creator-name-size, var(--font-size-s));
	line-height: 1.115rem;
}
.description {
	margin-top: var(--spacing-5xs);
	font-size: var(--font-size-2xs);
	line-height: 1rem;
	font-weight: var(--font-weight-regular);
	color: var(--node-creator-description-colos, var(--color-text-base));
}

.aiIcon {
	color: var(--color-secondary);
}

.triggerIcon {
	color: var(--color-primary);
}
</style>

<style lang="scss" scoped>
.el-tooltip svg {
	color: var(--color-foreground-xdark);
}
</style>
