<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import type { NodeIconSource } from '@/utils/nodeIcon';
import { useI18n } from '@n8n/i18n';

import {
	N8nIcon,
	N8nIconButton,
	N8nInlineTextEdit,
	N8nLink,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const props = defineProps<{
	nodeName: string;
	nodeTypeName: string;
	docsUrl?: string;
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
	<header :class="$style.ndvHeader">
		<div :class="$style.content">
			<NodeIcon v-if="icon" :class="$style.icon" :size="20" :icon-source="icon" />
			<div :class="$style.title">
				<N8nInlineTextEdit
					:model-value="nodeName"
					:min-width="0"
					:max-width="500"
					:placeholder="i18n.baseText('ndv.title.rename.placeholder')"
					:read-only="readOnly"
					@update:model-value="onRename"
				/>
			</div>
		</div>

		<div :class="$style.actions">
			<N8nLink v-if="docsUrl" theme="text" target="_blank" :href="docsUrl">
				<span :class="$style.docsLabel">
					<N8nText size="small" bold>
						{{ i18n.baseText('nodeSettings.docs') }}
					</N8nText>
					<N8nIcon icon="external-link" />
				</span>
			</N8nLink>
			<N8nTooltip>
				<template #content>
					{{ i18n.baseText('ndv.close.tooltip') }}
				</template>
				<N8nIconButton icon="x" type="tertiary" text @click="emit('close')" />
			</N8nTooltip>
		</div>
	</header>
</template>

<style lang="css" module>
.ndvHeader {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs);
	background: var(--color--background--light-3);
}

.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-left: var(--spacing--2xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.actions button:hover {
	background-color: var(--color--background);
}

.actions > *:not(:last-child) {
	border-right: var(--border);
	padding-right: var(--spacing--2xs);
}

.title {
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
}

.docsLabel {
	display: flex;
	gap: var(--spacing--4xs);
}

.icon {
	align-self: center;
	z-index: 1;
}
</style>
