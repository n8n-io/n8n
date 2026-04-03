<script setup lang="ts">
import { ref } from 'vue';
import { N8nCard, N8nText, N8nInput } from '@n8n/design-system';
import type { AgentSchema, ToolSchema } from '../types';
import AgentMiniEditor from './AgentMiniEditor.vue';

const props = defineProps<{ schema: AgentSchema | null }>();
const emit = defineEmits<{ 'update:schema': [changes: Partial<AgentSchema>] }>();

function emitToolUpdate(tool: ToolSchema, patch: Partial<ToolSchema>) {
	const currentTools = props.schema?.tools ?? [];
	const updatedTools = currentTools.map((t) => (t.name === tool.name ? { ...t, ...patch } : t));
	emit('update:schema', { tools: updatedTools });
}

function onNameBlur(tool: ToolSchema, newName: string) {
	const trimmed = newName.trim();
	if (!trimmed || trimmed === tool.name) return;
	emitToolUpdate(tool, { name: trimmed });
}

function onNameKeydown(tool: ToolSchema, event: KeyboardEvent, newName: string) {
	if (event.key === 'Enter') {
		(event.target as HTMLElement).blur();
		onNameBlur(tool, newName);
	}
}

function onDescBlur(tool: ToolSchema, newDesc: string) {
	if (newDesc === tool.description) return;
	emitToolUpdate(tool, { description: newDesc });
}

interface EditingState {
	name: string;
	description: string;
}

function makeEditingState(tool: ToolSchema): EditingState {
	return { name: tool.name, description: tool.description };
}

const editingStates = ref<Record<string, EditingState>>(
	Object.fromEntries((props.schema?.tools ?? []).map((t) => [t.name, makeEditingState(t)])),
);

function getState(tool: ToolSchema): EditingState {
	if (!editingStates.value[tool.name]) {
		editingStates.value[tool.name] = makeEditingState(tool);
	}
	return editingStates.value[tool.name];
}

function typeBadgeClass(type: ToolSchema['type']): string {
	const map: Record<ToolSchema['type'], string> = {
		custom: 'badgeCustom',
		workflow: 'badgeWorkflow',
		provider: 'badgeProvider',
		mcp: 'badgeMcp',
	};
	return map[type] ?? 'badgeMcp';
}

function typeLabel(type: ToolSchema['type']): string {
	const map: Record<ToolSchema['type'], string> = {
		custom: 'Custom',
		workflow: 'Workflow',
		provider: 'Provider',
		mcp: 'MCP',
	};
	return map[type] ?? type;
}

function inputSchemaProperties(
	schema: Record<string, unknown> | null,
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
				<span v-if="schema" :class="$style.count">({{ schema.tools.length }})</span>
			</N8nText>
			<N8nText size="small" :class="$style.hint">Add or remove tools in the Code tab</N8nText>
		</div>

		<template v-if="schema">
			<div v-if="schema.tools.length === 0" :class="$style.emptyState">
				<N8nText size="small" :class="$style.emptyText">
					No tools configured — add tools in the Code tab
				</N8nText>
			</div>

			<N8nCard v-for="tool in schema.tools" :key="tool.name" :class="$style.card">
				<template #header>
					<div :class="$style.cardHeader">
						<div :class="$style.nameRow">
							<N8nInput
								v-if="tool.editable"
								:model-value="getState(tool).name"
								size="small"
								:class="$style.nameInput"
								data-testid="tool-name-input"
								@update:model-value="getState(tool).name = $event"
								@blur="onNameBlur(tool, getState(tool).name)"
								@keydown="onNameKeydown(tool, $event, getState(tool).name)"
							/>
							<N8nText v-else bold :class="$style.toolName">{{ tool.name }}</N8nText>
						</div>
						<div :class="$style.badges">
							<span :class="[$style.badge, $style[typeBadgeClass(tool.type)]]">
								{{ typeLabel(tool.type) }}
							</span>
							<span v-if="tool.hasSuspend" :class="[$style.badge, $style.badgeHitl]">HITL</span>
							<span v-if="tool.hasToMessage" :class="[$style.badge, $style.badgeRichMessage]">
								Rich Message
							</span>
						</div>
					</div>
				</template>

				<div :class="$style.cardBody">
					<N8nInput
						v-if="tool.editable"
						:model-value="getState(tool).description"
						type="textarea"
						:rows="3"
						size="small"
						:class="$style.descInput"
						data-testid="tool-description-input"
						@update:model-value="getState(tool).description = $event"
						@blur="onDescBlur(tool, getState(tool).description)"
					/>
					<N8nText v-else size="small" :class="$style.description">
						{{ tool.description }}
					</N8nText>

					<div v-if="tool.type === 'workflow' && tool.workflowName" :class="$style.workflowLink">
						<N8nText size="small" :class="$style.workflowLabel">Workflow:</N8nText>
						<N8nText size="small" bold>{{ tool.workflowName }}</N8nText>
					</div>

					<div v-if="tool.inputSchema" :class="$style.inputSchema">
						<N8nText size="small" bold :class="$style.sectionLabel">Input Schema</N8nText>
						<ul :class="$style.propertyList">
							<li
								v-for="prop in inputSchemaProperties(tool.inputSchema)"
								:key="prop.name"
								:class="$style.propertyItem"
							>
								<N8nText size="small" bold>{{ prop.name }}</N8nText>
								<span :class="$style.propType">{{ prop.type }}</span>
							</li>
						</ul>
					</div>

					<details v-if="tool.handlerSource" :class="$style.handlerDetails">
						<summary :class="$style.handlerSummary">
							<N8nText size="small" bold>Handler Source</N8nText>
						</summary>
						<AgentMiniEditor
							:model-value="tool.handlerSource"
							language="typescript"
							:readonly="true"
							max-height="300px"
							min-height="80px"
						/>
					</details>
				</div>
			</N8nCard>
		</template>
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

.hint {
	color: var(--color--text--tint-2);
}

.emptyState {
	padding: var(--spacing--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	text-align: center;
}

.emptyText {
	color: var(--color--text--tint-2);
}

.card {
	width: 100%;
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.nameRow {
	flex: 1;
	min-width: 0;
}

.nameInput {
	width: 100%;
}

.toolName {
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
}

.badgeCustom {
	background-color: var(--color--primary--tint-3);
	color: var(--color--primary--shade-1);
}

.badgeWorkflow {
	background-color: var(--color--primary--tint-2);
	color: var(--color--primary);
}

.badgeProvider {
	background-color: var(--color--secondary--tint-2);
	color: var(--color--secondary);
}

.badgeMcp {
	background-color: var(--color--foreground--tint-1);
	color: var(--color--text--tint-2);
}

.badgeHitl {
	background-color: var(--color--success--tint-3);
	color: var(--color--success--shade-1);
}

.badgeRichMessage {
	background-color: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--xs);
}

.description {
	color: var(--color--text--tint-1);
	white-space: pre-wrap;
	word-break: break-word;
}

.descInput {
	width: 100%;
}

.workflowLink {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.workflowLabel {
	color: var(--color--text--tint-2);
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

.handlerDetails {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	overflow: hidden;
}

.handlerSummary {
	padding: var(--spacing--2xs) var(--spacing--xs);
	cursor: pointer;
	user-select: none;
	background-color: var(--color--foreground--tint-2);
}

.handlerSummary:hover {
	background-color: var(--color--foreground--tint-1);
}
</style>
