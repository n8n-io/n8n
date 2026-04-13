<script setup lang="ts">
import { computed } from 'vue';
import { N8nCard, N8nText, N8nButton } from '@n8n/design-system';
import type { AgentJsonConfig, AgentJsonToolRef } from '../types';
import type { CustomToolEntry } from '../agent.types';

const props = defineProps<{
	config: AgentJsonConfig | null;
	agentTools: Record<string, CustomToolEntry>;
}>();
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const tools = computed<AgentJsonToolRef[]>(() => props.config?.tools ?? []);

function removeTool(ref: AgentJsonToolRef) {
	const updated = tools.value.filter((t) => t !== ref);
	emit('update:config', { tools: updated });
}

function toolLabel(ref: AgentJsonToolRef): string {
	if (ref.type === 'custom') {
		const descriptor = props.agentTools[ref.id ?? '']?.descriptor;
		return descriptor?.name ?? ref.id ?? '';
	}
	if (ref.type === 'workflow') return ref.name ?? ref.workflow ?? ref.type;
	return ref.name ?? ref.type;
}

function toolDescription(ref: AgentJsonToolRef): string | undefined {
	if (ref.type === 'custom') {
		return props.agentTools[ref.id ?? '']?.descriptor?.description;
	}
	return ref.description;
}

function typeBadge(ref: AgentJsonToolRef): string {
	return ref.type;
}

function badgeClass(ref: AgentJsonToolRef): string {
	return (
		{
			custom: 'badgeCustom',
			workflow: 'badgeWorkflow',
			node: 'badgeNode',
		}[ref.type] ?? 'badgeNode'
	);
}

function inputSchemaProperties(
	schema: Record<string, unknown> | null | undefined,
): Array<{ name: string; type: string }> {
	if (!schema) return [];
	const properties = (schema as { properties?: Record<string, { type?: string }> }).properties;
	if (!properties) return [];
	return Object.entries(properties).map(([name, def]) => ({
		name,
		type: typeof def === 'object' && def !== null && 'type' in def ? String(def.type) : 'unknown',
	}));
}
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<N8nText tag="h3" bold :class="$style.heading">
				Tools
				<span :class="$style.count">({{ tools.length }})</span>
			</N8nText>
			<N8nText size="small" color="text-light">
				Use the AI builder to add custom tools or workflow tools.
			</N8nText>
		</div>

		<div v-if="tools.length === 0" :class="$style.emptyState">
			<N8nText size="small" color="text-light">
				No tools configured yet — ask the AI builder to add tools.
			</N8nText>
		</div>

		<N8nCard v-for="(tool, idx) in tools" :key="idx" :class="$style.card">
			<template #header>
				<div :class="$style.cardHeader">
					<N8nText bold :class="$style.toolName">{{ toolLabel(tool) }}</N8nText>
					<div :class="$style.badges">
						<span :class="[$style.badge, $style[badgeClass(tool)]]">
							{{ typeBadge(tool) }}
						</span>
						<span v-if="tool.requireApproval" :class="[$style.badge, $style.badgeApproval]">
							Approval
						</span>
					</div>
					<N8nButton
						type="tertiary"
						size="mini"
						icon="trash-2"
						:class="$style.removeBtn"
						data-testid="remove-tool-btn"
						@click="removeTool(tool)"
					/>
				</div>
			</template>

			<div :class="$style.cardBody">
				<!-- Description -->
				<N8nText v-if="toolDescription(tool)" size="small" :class="$style.description">
					{{ toolDescription(tool) }}
				</N8nText>

				<!-- Custom tool: input schema from descriptor -->
				<template v-if="tool.type === 'custom' && tool.id">
					<div v-if="agentTools[tool.id]?.descriptor?.inputSchema" :class="$style.inputSchema">
						<N8nText size="small" bold :class="$style.sectionLabel">Input parameters</N8nText>
						<ul :class="$style.propertyList">
							<li
								v-for="prop in inputSchemaProperties(agentTools[tool.id]!.descriptor.inputSchema)"
								:key="prop.name"
								:class="$style.propertyItem"
							>
								<N8nText size="small" bold>{{ prop.name }}</N8nText>
								<span :class="$style.propType">{{ prop.type }}</span>
							</li>
						</ul>
					</div>
				</template>

				<!-- Workflow tool: show workflow name -->
				<template v-else-if="tool.type === 'workflow'">
					<div :class="$style.metaRow">
						<N8nText size="small" color="text-light">Workflow:</N8nText>
						<N8nText size="small" bold>{{ tool.workflow }}</N8nText>
					</div>
				</template>

				<!-- Node tool: show node type -->
				<template v-else-if="tool.type === 'node' && tool.node">
					<div v-if="tool.node.nodeType" :class="$style.metaRow">
						<N8nText size="small" color="text-light">Node type:</N8nText>
						<N8nText size="small" bold>{{ tool.node.nodeType }}</N8nText>
					</div>
				</template>
			</div>
		</N8nCard>
	</div>
</template>

<style module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--xs);
}

.heading {
	margin: 0;
}

.count {
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-2);
}

.emptyState {
	padding: var(--spacing--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	text-align: center;
}

.card {
	width: 100%;
}

.cardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.toolName {
	flex: 1;
	min-width: 0;
	word-break: break-word;
}

.badges {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.badge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--sm);
	white-space: nowrap;
	text-transform: uppercase;
}

.badgeCustom {
	background-color: var(--color--primary--tint-3);
	color: var(--color--primary--shade-1);
}

.badgeWorkflow {
	background-color: var(--color--primary--tint-2);
	color: var(--color--primary);
}

.badgeNode {
	background-color: var(--color--foreground--tint-1);
	color: var(--color--text--tint-2);
}

.badgeApproval {
	background-color: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}

.removeBtn {
	margin-left: auto;
	flex-shrink: 0;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-top: var(--spacing--xs);
}

.description {
	color: var(--color--text--tint-1);
	white-space: pre-wrap;
	word-break: break-word;
}

.metaRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.inputSchema {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.sectionLabel {
	color: var(--color--text--tint-1);
}

.propertyList {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.propertyItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.propType {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	background-color: var(--color--foreground--tint-1);
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius--sm);
	font-family: monospace;
}
</style>
