<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { InstanceAiDraftMention } from './instanceAiMentions.types';

const props = defineProps<{ mention: InstanceAiDraftMention }>();
const emit = defineEmits<{ remove: [] }>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const root = ref<HTMLElement>();

const nodeType = computed(() => {
	if (props.mention.target.kind !== 'node' || props.mention.attachment.type !== 'nodes')
		return null;
	const node = props.mention.attachment.sets[0]?.nodes[0];
	return node?.type ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
});

const removeKey: Record<InstanceAiDraftMention['target']['kind'], BaseTextKey> = {
	workflow: 'instanceAi.mentions.remove.workflow',
	node: 'instanceAi.mentions.remove.node',
	'canvas-group': 'instanceAi.mentions.remove.canvasGroup',
};

const removeLabel = computed(() =>
	i18n.baseText(removeKey[props.mention.target.kind], {
		interpolate: { name: props.mention.label },
	}),
);

function handleKeydown(event: KeyboardEvent): void {
	if (event.key !== 'Backspace' && event.key !== 'Delete') return;
	event.preventDefault();
	event.stopPropagation();
	emit('remove');
}

defineExpose({ focus: () => root.value?.focus() });
</script>

<template>
	<N8nTooltip :content="mention.label" placement="top">
		<span
			ref="root"
			:class="$style.chip"
			tabindex="0"
			role="group"
			:data-test-id="`instance-ai-mention-chip-${mention.target.kind}`"
			:aria-label="mention.label"
			@keydown="handleKeydown"
		>
			<N8nIcon v-if="mention.target.kind === 'workflow'" icon="workflow" size="small" />
			<N8nIcon v-else-if="mention.target.kind === 'canvas-group'" icon="layers" size="small" />
			<NodeIcon v-else-if="nodeType" :node-type="nodeType" :size="12" />
			<N8nIcon v-else icon="crosshair" size="small" />
			<span :class="$style.label">{{ mention.label }}</span>
			<button
				type="button"
				:class="$style.remove"
				:data-test-id="`instance-ai-mention-remove-${mention.target.kind}`"
				:aria-label="removeLabel"
				@click.stop="emit('remove')"
			>
				<N8nIcon icon="x" size="small" />
			</button>
		</span>
	</N8nTooltip>
</template>

<style lang="scss" module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: calc(var(--spacing--5xl) * 2);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border-width) solid var(--border-color--success);
	border-radius: var(--radius);
	background: var(--background--success);
	color: var(--text-color--success);
	font-size: var(--font-size--2xs);

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--sm);
}

.remove {
	display: inline-flex;
	flex: 0 0 auto;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: none;
	border-radius: var(--radius--sm);
	background: transparent;
	color: inherit;
	cursor: pointer;

	&:hover,
	&:focus-visible {
		background: var(--color--background--light-2);
	}
}
</style>
