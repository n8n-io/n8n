<script setup lang="ts">
import { computed, watch } from 'vue';
import type { AgentJsonConfig } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';

const props = defineProps<{ config?: AgentJsonConfig | null; projectId: string }>();
const i18n = useI18n();
const nodeTypes = useNodeTypesStore();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
watch(
	() => [props.projectId, props.config?.integrations] as const,
	([projectId, integrations]) => {
		if (integrations?.length) void ensureLoaded(projectId).catch(() => {});
	},
	{ immediate: true },
);

const services = computed(() => {
	const names: string[] = [];
	for (const tool of props.config?.tools ?? []) {
		if (tool.enabled === false) continue;
		if (tool.type === 'node') {
			const nodeType = nodeTypes.getNodeType(tool.node.nodeType, tool.node.nodeTypeVersion);
			names.push(nodeType?.displayName?.replace(/ Tool$/, '') ?? tool.name);
		} else if (tool.type === 'workflow') names.push(tool.name || tool.workflow);
		else names.push(formatToolNameForDisplay(tool.id));
	}
	for (const server of props.config?.mcpServers ?? []) names.push(server.name);
	for (const channel of props.config?.integrations ?? []) {
		if (channel.type === 'n8n_chat' || !channel.credentialId.trim()) continue;
		names.push(
			catalog.value?.find((entry) => entry.type === channel.type)?.label ??
				formatToolNameForDisplay(channel.type),
		);
	}
	return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
});
const message = computed(() => {
	const [first, second] = services.value;
	if (!first) return i18n.baseText('agents.builder.agentEvals.mockNotice.none');
	if (!second)
		return i18n.baseText('agents.builder.agentEvals.mockNotice.one', { interpolate: { first } });
	if (services.value.length === 2)
		return i18n.baseText('agents.builder.agentEvals.mockNotice.two', {
			interpolate: { first, second },
		});
	return i18n.baseText('agents.builder.agentEvals.mockNotice.more', {
		interpolate: { first, second, count: String(services.value.length - 2) },
	});
});
</script>

<template>
	<N8nText size="small" color="text-base" data-test-id="agent-eval-mock-notice">{{
		message
	}}</N8nText>
</template>
