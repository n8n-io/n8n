<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { FocusedNode } from '../../focusedNodes.types';

interface Props {
	node: FocusedNode;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	click: [];
	remove: [];
}>();

const nodeTypesStore = useNodeTypesStore();

const isConfirmed = computed(() => props.node.state === 'confirmed');
const isUnconfirmed = computed(() => props.node.state === 'unconfirmed');

const nodeType = computed(() => nodeTypesStore.getNodeType(props.node.nodeType));

const truncatedName = computed(() => {
	const name = props.node.nodeName;
	const maxLength = 20;
	if (name.length <= maxLength) return name;
	return `${name.substring(0, maxLength - 1)}...`;
});

function handleClick(event: MouseEvent) {
	event.stopPropagation();
	emit('click');
}

function handleRemove(event: MouseEvent) {
	event.stopPropagation();
	emit('remove');
}
</script>

<template>
	<span :class="[$style.chip, { [$style.unconfirmed]: isUnconfirmed }]" @click="handleClick">
		<span :class="[$style.iconWrapper, { [$style.confirmedIcon]: isConfirmed }]">
			<N8nIcon v-if="isUnconfirmed" icon="plus" size="xsmall" :class="$style.prefixIcon" />
			<NodeIcon v-else :node-type="nodeType" :size="12" />
		</span>
		<span :class="$style.label">{{ truncatedName }}</span>
		<button v-if="isConfirmed" type="button" :class="$style.removeButton" @click="handleRemove">
			<N8nIcon icon="x" size="xsmall" />
		</button>
	</span>
</template>

<style lang="scss" module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 24px;
	padding: 0 var(--spacing--2xs);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	background-color: var(--background--success);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	border: 1px solid var(--background--success);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	color: var(--text-color--success);
	cursor: pointer;
	white-space: nowrap;

	&:hover {
		background-color: var(--color--success--tint-2);
	}

	&.unconfirmed {
		background-color: var(--color--background--light-3);
		border: 1px dashed var(--color--foreground);
		color: var(--color--text--tint-1);
		font-style: italic;

		&:hover {
			background-color: var(--color--background--light-1);
		}
	}
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
}

.confirmedIcon {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	color: var(--text-color--success);
	mix-blend-mode: luminosity;

	:global(svg) {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		color: var(--text-color--success);
	}
}

.prefixIcon {
	color: var(--color--text--tint-1);
}

.label {
	line-height: 1;
}

.removeButton {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 24px;
	min-height: 24px;
	padding: 0;
	margin-left: var(--spacing--4xs);
	background: none;
	border: none;
	cursor: pointer;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	color: var(--text-color--success);

	&:hover {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		color: var(--text-color--success);
	}
}
</style>
