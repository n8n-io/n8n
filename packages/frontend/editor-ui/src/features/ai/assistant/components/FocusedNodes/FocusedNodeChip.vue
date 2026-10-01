<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
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

const i18n = useI18n();
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
	<N8nTooltip
		:content="i18n.baseText('focusedNodes.unconfirmedTooltip')"
		:disabled="!isUnconfirmed"
		placement="top"
		:show-after="300"
	>
		<span :class="[$style.chip, { [$style.unconfirmed]: isUnconfirmed }]" @click="handleClick">
			<span :class="[$style.iconWrapper, { [$style.confirmedIcon]: isConfirmed }]">
				<N8nIcon v-if="isUnconfirmed" icon="plus" size="xsmall" :class="$style.prefixIcon" />
				<template v-else>
					<NodeIcon :node-type="nodeType" :size="12" :class="$style.nodeIcon" />
					<button type="button" :class="$style.removeButton" @click="handleRemove">
						<N8nIcon icon="x" :class="$style.closeIcon" />
					</button>
				</template>
			</span>
			<span :class="$style.label">{{ truncatedName }}</span>
		</span>
	</N8nTooltip>
</template>

<style lang="scss" module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: 24px;
	padding: 0 var(--spacing--2xs);
	background-color: light-dark(var(--color--green-100), var(--color--green-900));
	border: 1px solid light-dark(var(--color--green-100), var(--color--green-900));
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: light-dark(var(--color--green-800), var(--color--green-200));
	cursor: pointer;
	white-space: nowrap;

	&:hover {
		background-color: light-dark(var(--color--green-200), var(--color--green-800));
	}

	&.unconfirmed {
		background-color: var(--color--background--light-3);
		border: 1px dashed light-dark(var(--color--foreground--shade-2), var(--color--foreground));
		color: light-dark(var(--color--foreground--shade-2), var(--color--text--tint-1));
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
	width: 12px;
	height: 12px;
	position: relative;
	overflow: visible;
}

.confirmedIcon {
	color: light-dark(var(--color--green-800), var(--color--green-200));

	:global(svg) {
		color: light-dark(var(--color--green-800), var(--color--green-200));
	}

	:global(img) {
		mix-blend-mode: luminosity;
	}
}

.nodeIcon {
	.chip:hover & {
		display: none;
	}
}

.removeButton {
	display: none;
	align-items: center;
	justify-content: center;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
	color: light-dark(var(--color--green-800), var(--color--green-200));

	.chip:hover & {
		display: flex;
	}
}

.closeIcon :global(svg) {
	width: 24px;
	height: 24px;
}

.prefixIcon {
	color: light-dark(var(--color--foreground--shade-2), var(--color--text--tint-1));
}

.label {
	line-height: 1;
}
</style>
