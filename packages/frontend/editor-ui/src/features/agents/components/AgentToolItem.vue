<script setup lang="ts">
/**
 * Row component for the Agent Tools modal.
 *
 * Forked from Chat Hub's `ToolListItem` to match the Agents Figma spec:
 *   - Connected rows show "✓ Connected" (or "Add credentials" chip) + gear,
 *     not an enable/disable toggle.
 *   - Available rows use a "Connect" button.
 *
 * Kept as a sibling component so Chat Hub's list item remains untouched.
 */
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nButton, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { computed, useCssModule, useAttrs } from 'vue';

import ToolConnectedBadge from './ToolConnectedBadge.vue';
import ToolCredsMissingChip from './ToolCredsMissingChip.vue';

const props = defineProps<{
	nodeType: INodeTypeDescription;
	configuredNode?: INode;
	mode: 'configured' | 'available';
	/** When true, surfaces an "Add credentials" warning chip instead of "✓ Connected". */
	missingCredentials?: boolean;
}>();

const emit = defineEmits<{
	configure: [];
	add: [];
}>();

const i18n = useI18n();
const attrs = useAttrs();
const style = useCssModule();

defineOptions({ inheritAttrs: false });

const containerClass = computed(() => [
	style.item,
	{ [style.configured]: props.mode === 'configured' },
	attrs.class,
]);

const description = computed(() => {
	// Configured rows: subtitle is the attached credential name (e.g. "Slack Token"),
	// or a neutral "No credentials" when the tool hasn't been linked to one yet.
	if (props.mode === 'configured' && props.configuredNode) {
		const creds = props.configuredNode.credentials ?? {};
		const firstCred = Object.values(creds)[0];
		if (firstCred?.name) return firstCred.name;
		return i18n.baseText('agents.tools.noCredentials');
	}
	// Available rows: subtitle is the node type's description.
	return props.nodeType.description;
});

const displayName = computed(() => {
	if (props.configuredNode) return props.configuredNode.name;
	return props.nodeType.displayName;
});
</script>

<template>
	<div v-bind="attrs" :class="containerClass">
		<div :class="$style.iconWrapper">
			<NodeIcon :node-type="nodeType" :size="32" />
		</div>

		<div :class="$style.content">
			<N8nText :class="$style.name" size="small" color="text-dark">{{ displayName }}</N8nText>
			<N8nText :class="$style.description" size="small" color="text-light">
				{{ description }}
			</N8nText>
		</div>

		<div :class="$style.actions">
			<template v-if="mode === 'configured'">
				<ToolCredsMissingChip
					v-if="missingCredentials"
					data-test-id="agent-tool-add-credentials-chip"
					@click="emit('configure')"
				/>
				<ToolConnectedBadge v-else />

				<N8nTooltip :content="i18n.baseText('agents.tools.configure')">
					<N8nIconButton icon="settings" variant="ghost" text @click="emit('configure')" />
				</N8nTooltip>
			</template>

			<template v-else>
				<N8nButton variant="subtle" size="small" @click="emit('add')">
					{{ i18n.baseText('agents.tools.connect') }}
				</N8nButton>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.iconWrapper {
	flex-shrink: 0;
	width: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.description {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}
</style>
