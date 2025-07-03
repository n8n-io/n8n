<script setup lang="ts">
import type { NodeIconSource } from '@/utils/nodeIcon';
import { N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	nodeName: string;
	nodeTypeName: string;
	icon?: NodeIconSource;
	readOnly?: boolean;
}>();

const i18n = useI18n();

const emit = defineEmits<{ close: []; rename: [name: string] }>();

function onRename(newNodeName: string) {
	emit('rename', newNodeName || props.nodeTypeName);
}
</script>

<template>
	<header :class="[$style.ndvHeader, { [$style.editable]: !readOnly }]">
		<div :class="$style.content">
			<NodeIcon v-if="icon" :class="$style.icon" :size="20" :icon-source="icon" />
			<div :class="$style.title">
				<N8nInlineTextEdit
					:model-value="nodeName"
					:read-only="readOnly"
					@update:model-value="onRename"
				/>
			</div>

			<p v-if="nodeName !== nodeTypeName" :class="$style.subtitle">
				{{ nodeTypeName }}
			</p>
		</div>

		<N8nTooltip>
			<template #content>
				{{ i18n.baseText('ndv.close.tooltip') }}
			</template>
			<N8nIconButton icon="x" type="tertiary" @click="emit('close')" />
		</N8nTooltip>
	</header>
</template>

<style lang="css" module>
.ndvHeader {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-2xs);
	padding: var(--spacing-2xs);
	background: var(--color-background-xlight);
}

.content {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing-2xs);
	margin-left: var(--spacing-2xs);
}

.title {
	color: var(--color-text-dark);
	font-size: var(--font-size-m);
}

.titleInput input {
	--icon-width: 20px;
	font-size: var(--font-size-m);
	margin-left: calc(-1 * var(--icon-width) - var(--spacing-s));
	padding-left: calc(var(--icon-width) + var(--spacing-s));
	z-index: -1;
}

.editable .title {
	cursor: pointer;

	&:hover {
		background-color: var(--color-background-base);
		border-radius: var(--border-radius-base);
		outline: solid 2px var(--color-background-base);
	}
}

.subtitle {
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	margin: 0;
}

.icon {
	align-self: center;
	z-index: 1;
}
</style>
