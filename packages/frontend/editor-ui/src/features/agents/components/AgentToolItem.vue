<script setup lang="ts">
/**
 * Row component for the Agent Tools modal.
 *
 * Forked from Chat Hub's `ToolListItem` to match the Agents Figma spec:
 *   - Connected rows show "✓ Connected" (or "Add credentials" chip) + gear,
 *     not an enable/disable toggle.
 *   - Available rows use a "Connect" button (or "Install" for community previews).
 *
 * Kept as a sibling component so Chat Hub's list item remains untouched.
 */
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nButton, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { computed, useCssModule, useAttrs } from 'vue';
import ShieldIcon from 'virtual:icons/fa-solid/shield-alt';

import ToolConnectedBadge from './ToolConnectedBadge.vue';
import ToolApprovalBadge from './ToolApprovalBadge.vue';
import ToolCredsMissingChip from './ToolCredsMissingChip.vue';

const props = defineProps<{
	nodeType: INodeTypeDescription;
	configuredNode?: INode;
	mode: 'configured' | 'available';
	/** When true, surfaces an "Add credentials" warning chip instead of "✓ Connected". */
	missingCredentials?: boolean;
	requireApproval?: boolean;
	/** Uninstalled verified community preview — show Install CTA + verified badge. */
	communityPreview?: boolean;
	installing?: boolean;
	/** Non-admin cannot install; button is disabled with contact-admin tooltip. */
	installDisabled?: boolean;
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

const actionLabel = computed(() =>
	props.communityPreview
		? i18n.baseText('communityNodeDetails.install')
		: i18n.baseText('agents.tools.connect'),
);

const actionDisabled = computed(
	() => props.communityPreview && (props.installing || props.installDisabled),
);
</script>

<template>
	<div v-bind="attrs" :class="containerClass">
		<div :class="$style.iconWrapper">
			<NodeIcon :node-type="nodeType" :size="32" />
		</div>

		<div :class="$style.content">
			<div :class="$style.nameRow">
				<N8nText :class="$style.name" size="small" color="text-dark">{{ displayName }}</N8nText>
				<N8nTooltip
					v-if="communityPreview"
					:content="i18n.baseText('communityNodeInfo.approved')"
					placement="top"
				>
					<ShieldIcon :class="$style.verifiedIcon" data-test-id="agent-tool-verified-badge" />
				</N8nTooltip>
			</div>
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
				<template v-else>
					<ToolApprovalBadge v-if="requireApproval" />
					<ToolConnectedBadge />
				</template>

				<N8nTooltip :content="i18n.baseText('agents.tools.configure')">
					<N8nIconButton icon="settings" variant="ghost" text @click="emit('configure')" />
				</N8nTooltip>
			</template>

			<template v-else>
				<N8nTooltip
					v-if="communityPreview && installDisabled && !installing"
					:content="i18n.baseText('communityNodeInfo.contact.admin')"
					placement="top"
				>
					<span>
						<N8nButton
							variant="subtle"
							size="small"
							:loading="installing"
							:disabled="true"
							data-test-id="agent-tool-install-button"
						>
							{{ actionLabel }}
						</N8nButton>
					</span>
				</N8nTooltip>
				<N8nButton
					v-else
					variant="subtle"
					size="small"
					:loading="installing"
					:disabled="actionDisabled"
					:data-test-id="
						communityPreview ? 'agent-tool-install-button' : 'agent-tool-connect-button'
					"
					@click="emit('add')"
				>
					{{ actionLabel }}
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

.nameRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.verifiedIcon {
	flex-shrink: 0;
	width: 12px;
	height: 12px;
	color: var(--color--success);
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
