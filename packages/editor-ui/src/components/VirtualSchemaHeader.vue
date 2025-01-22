<script lang="ts" setup>
import { computed } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { type INodeTypeDescription } from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const props = defineProps<{
	title: string;
	info?: string;
	collapsable: boolean;
	collapsed: boolean;
	nodeType: INodeTypeDescription;
	itemCount: number | null;
}>();

const i18n = useI18n();
const isTrigger = computed(() => props.nodeType.group.includes('trigger'));
const emit = defineEmits<{
	'click:toggle': [];
}>();
</script>

<template>
	<div class="schema-header" data-test-id="run-data-schema-header">
		<div class="toggle" @click.capture.stop="emit('click:toggle')">
			<FontAwesomeIcon icon="angle-down" :class="{ 'collapse-icon': true, collapsed }" />
		</div>

		<NodeIcon
			class="icon"
			:class="{ ['icon-trigger']: isTrigger }"
			:node-type="nodeType"
			:size="12"
		/>
		<div class="title">
			{{ title }}
			<span v-if="info" class="info">{{ info }}</span>
		</div>
		<FontAwesomeIcon v-if="isTrigger" class="trigger-icon" icon="bolt" size="xs" />
		<div v-if="itemCount" class="item-count" data-test-id="run-data-schema-node-item-count">
			{{ i18n.baseText('ndv.output.items', { interpolate: { count: itemCount } }) }}
		</div>
	</div>
</template>

<style lang="scss" scoped>
.schema-header {
	display: flex;
	align-items: center;
	padding-bottom: var(--spacing-2xs);
	cursor: pointer;
}
.toggle {
	width: 30px;
	height: 30px;
	display: flex;
	justify-content: center;
	align-items: center;
}
.collapse-icon {
	transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1);
}
.collapsed {
	transform: rotateZ(-90deg);
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-xlight);
	margin-right: var(--spacing-2xs);
}

.icon-trigger {
	border-radius: 16px 4px 4px 16px;
}

.title {
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
}

.info {
	margin-left: var(--spacing-2xs);
	color: var(--color-text-light);
	font-weight: var(--font-weight-regular);
}

.trigger-icon {
	margin-left: var(--spacing-2xs);
	color: var(--color-primary);
}

.item-count {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-left: auto;
}
</style>
