<script setup lang="ts">
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import type { AgentJsonConfig } from '@n8n/api-types';
import { nodeNameToToolName } from 'n8n-workflow';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { N8nApprovalCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useApprovalCardLabels } from '@/app/composables/useApprovalCardLabels';
import type { ApprovalInput, ApprovalResume } from '@/features/ai/shared/agentsChat/types';

const props = withDefaults(
	defineProps<{
		input: ApprovalInput;
		agentName?: string;
		tools?: AgentJsonConfig['tools'];
		disabled?: boolean;
		autoFocus?: boolean;
		/** Show number shortcuts and enable their key events. */
		useKeyShortcuts?: boolean;
	}>(),
	{ autoFocus: true, useKeyShortcuts: true },
);

const emit = defineEmits<{
	submit: [resumeData: ApprovalResume];
}>();

const i18n = useI18n();
const approvalLabels = useApprovalCardLabels();

const toolLabel = computed(() => props.input.displayName ?? props.input.toolName);
const nodeType = computed(() => {
	const tool = props.tools?.find(
		(tool) => tool.type === 'node' && nodeNameToToolName(tool.name) === props.input.toolName,
	);
	if (tool?.type !== 'node') return null;
	const nodeTypesStore = useNodeTypesStore();
	return (
		nodeTypesStore.getNodeType(tool.node.nodeType, tool.node.nodeTypeVersion) ??
		nodeTypesStore.communityNodeType(tool.node.nodeType)?.nodeDescription ??
		null
	);
});

function submit(key: string) {
	if (props.disabled) return;
	if (key === 'always-allow') {
		emit('submit', { approved: true, scope: 'session' });
		return;
	}
	if (key === 'allow-once' || key === 'deny') {
		emit('submit', { approved: key === 'allow-once' });
	}
}
</script>

<template>
	<N8nApprovalCard
		:title="
			i18n.baseText('agents.chat.approval.description', { interpolate: { toolName: toolLabel } })
		"
		:labels="approvalLabels"
		:args="input.args"
		:supports-session-approval="input.supportsSessionApproval"
		:disabled="disabled"
		:auto-focus="autoFocus"
		:use-key-shortcuts="useKeyShortcuts"
		data-testid="agent-approval-card"
		@select="submit"
	>
		<template #title>
			<N8nText step="sm">
				<I18nT keypath="agents.chat.approval.agentDescription" scope="global">
					<template #agentName>
						{{ agentName?.trim() || i18n.baseText('agentSessions.timeline.agent') }}
					</template>
					<template #toolName>
						<span :class="$style.nameBadge">
							<NodeIcon v-if="nodeType" :node-type="nodeType" aria-hidden="true" />
							<N8nIcon v-else icon="wrench" aria-hidden="true" />
							{{ toolLabel }}
						</span>
					</template>
				</I18nT>
			</N8nText>
		</template>
	</N8nApprovalCard>
</template>

<style module lang="scss">
.nameBadge {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	color: var(--text-color);
	gap: var(--spacing--3xs);
	height: 1lh;
	transform: translateY(2px);
	padding: var(--spacing--4xs);
	font-weight: var(--font-weight--medium);
}
</style>
