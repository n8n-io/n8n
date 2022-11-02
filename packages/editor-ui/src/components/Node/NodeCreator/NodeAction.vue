<template>
	<div
		:class="$style.categoryAction"
		draggable
		@dragstart="$listeners.dragstart"
		@dragend="$listeners.dragend"
	>
		<button :class="$style.categoryActionButton" @click="$listeners.click">
			<node-icon :class="$style.nodeIcon" :nodeType="nodeType"/>
			<p v-text="action.title" />
			<trigger-icon v-if="isTriggerAction(action)" :class="$style.triggerIcon" />
		</button>
	</div>
</template>

<script lang="ts" setup>
import { INodeTypeDescription, INodeAction } from 'n8n-workflow';
import NodeIcon from '@/components/NodeIcon.vue';
import TriggerIcon from '@/components/TriggerIcon.vue';

export interface Props {
	nodeType: INodeTypeDescription,
	action: INodeAction
}

defineProps<Props>();

const isTriggerAction = (action: INodeAction) => action.nodeName?.toLowerCase().includes('trigger');
</script>

<style lang="scss" module>
.categoryAction {
	display: block;
	list-style: none;
	cursor: pointer;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-compact);
	color: var(--color-text-dark);
	display: flex;
	align-items: center;

	&:not(:last-child) {
		margin-bottom: var(--spacing-m);
	}
}
.categoryActionButton {
	border: none;
	background: none;
	display: flex;
	align-items: center;
	text-align: left;
	position: relative;
	cursor: pointer;
	padding: 0;
	color: var(--color-text-dark);

	&:hover:before {
		content: "";
		position: absolute;
		right: calc(100% + var(--spacing-s) - 1px);
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--color-primary);
	}
}
.triggerIcon {
	border: none;
	width: 20px;
	height: 20px;
}
.nodeIcon {
	margin-right: var(--spacing-s);
}
</style>
