<script setup lang="ts">
import {
	MCP_SERVER_TOOL_NAME_MAX_LENGTH,
	mcpServerToolNameSchema,
	type McpServerToolResponse,
	type UpdateMcpServerToolDto,
} from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nBadge,
	N8nCallout,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

// One tool of a server. Collapsed: the name and the description. Expanded: the source link, the
// tool name, the description, and a menu with "Remove". A field saves when it loses focus.
const props = defineProps<{
	tool: McpServerToolResponse;
	canUpdate: boolean;
	/** The URL of the source workflow, which opens in a new tab. */
	workflowHref: string | null;
	/** Open the row on mount, for a deep link. */
	initiallyExpanded?: boolean;
}>();

const emit = defineEmits<{
	update: [changes: UpdateMcpServerToolDto];
	remove: [];
}>();

const i18n = useI18n();
const expanded = ref(props.initiallyExpanded ?? false);
const toolName = ref(props.tool.toolName);
const description = ref(props.tool.description);

// A save or a failed save gives a new tool object, so the fields show what the server has.
watch(
	() => props.tool,
	(tool) => {
		toolName.value = tool.toolName;
		description.value = tool.description;
	},
);

const nameInvalid = computed(() => !mcpServerToolNameSchema.safeParse(toolName.value).success);
const missingDescription = computed(() => props.tool.description.trim() === '');

const menuActions = computed(() => [
	{
		value: 'remove' as const,
		label: i18n.baseText('mcpServers.tools.row.remove'),
		destructive: true,
	},
]);

function onMenu(action: string) {
	if (action === 'remove') emit('remove');
}

function saveName() {
	if (nameInvalid.value || toolName.value === props.tool.toolName) return;
	emit('update', { toolName: toolName.value });
}

function saveDescription() {
	const value = description.value.trim();
	if (value === props.tool.description) return;
	emit('update', { description: value });
}
</script>

<template>
	<div
		:class="[$style.row, { [$style.expanded]: expanded, [$style.warning]: !!tool.brokenReason }]"
		data-test-id="mcp-tool-row"
		:data-tool-name="tool.toolName"
	>
		<button
			type="button"
			:class="$style.summary"
			:aria-expanded="expanded"
			data-test-id="mcp-tool-row-toggle"
			@click="expanded = !expanded"
		>
			<span :class="$style.summaryText">
				<span :class="$style.nameLine">
					<span :class="$style.name">{{ tool.toolName }}</span>
					<N8nBadge
						v-if="tool.brokenReason"
						variant="warning"
						size="xsmall"
						data-test-id="mcp-tool-row-broken"
					>
						{{ i18n.baseText(`mcpServers.tools.broken.badge.${tool.brokenReason}`) }}
					</N8nBadge>
				</span>
				<span
					v-if="missingDescription"
					:class="$style.missing"
					data-test-id="mcp-tool-row-missing-description"
				>
					<N8nIcon icon="triangle-alert" size="xsmall" />
					{{ i18n.baseText('mcpServers.tools.row.missingDescription') }}
				</span>
				<span v-else :class="$style.description">{{ tool.description }}</span>
			</span>
			<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" :class="$style.chevron" />
		</button>

		<div v-if="expanded" :class="$style.editor" data-test-id="mcp-tool-row-editor">
			<div :class="$style.sourceLine">
				<N8nLink
					v-if="workflowHref"
					:to="workflowHref"
					new-window
					size="small"
					data-test-id="mcp-tool-row-source-link"
				>
					{{ i18n.baseText('mcpServers.tools.row.fromWorkflow') }}
					<N8nIcon icon="external-link" size="xsmall" />
				</N8nLink>
				<N8nActionToggle
					v-if="canUpdate"
					:actions="menuActions"
					:aria-label="i18n.baseText('mcpServers.tools.row.menu')"
					placement="bottom-end"
					data-test-id="mcp-tool-row-menu"
					data-attr="mcp-tool-row-menu"
					@action="onMenu"
				/>
			</div>

			<N8nCallout
				v-if="tool.brokenReason"
				theme="warning"
				data-test-id="mcp-tool-row-broken-callout"
			>
				{{ i18n.baseText(`mcpServers.tools.broken.callout.${tool.brokenReason}`) }}
			</N8nCallout>

			<template v-if="canUpdate">
				<div>
					<N8nInputLabel
						:label="i18n.baseText('mcpServers.tools.row.toolName')"
						:bold="false"
						size="small"
					>
						<N8nInput
							v-model="toolName"
							:class="$style.mono"
							:maxlength="MCP_SERVER_TOOL_NAME_MAX_LENGTH"
							data-test-id="mcp-tool-row-name-input"
							@blur="saveName"
						/>
					</N8nInputLabel>
					<N8nText
						v-if="nameInvalid"
						tag="p"
						size="small"
						color="danger"
						:class="$style.hint"
						data-test-id="mcp-tool-row-name-error"
					>
						{{ i18n.baseText('mcpServers.tools.row.toolNameInvalid') }}
					</N8nText>
					<N8nText v-else tag="p" size="small" color="text-light" :class="$style.hint">
						{{ i18n.baseText('mcpServers.tools.row.toolNameHint') }}
					</N8nText>
				</div>

				<div>
					<N8nInputLabel
						:label="i18n.baseText('mcpServers.tools.row.description')"
						:bold="false"
						size="small"
					>
						<!-- Two rows by default. The builder drags the bottom-right corner to make it taller. -->
						<N8nInput
							v-model="description"
							type="textarea"
							:rows="2"
							:class="$style.resizable"
							data-test-id="mcp-tool-row-description-input"
							@blur="saveDescription"
						/>
					</N8nInputLabel>
					<N8nText
						v-if="missingDescription"
						tag="p"
						size="small"
						color="warning"
						:class="$style.hint"
					>
						{{ i18n.baseText('mcpServers.tools.row.missingDescription') }}
					</N8nText>
					<N8nText v-else tag="p" size="small" color="text-light" :class="$style.hint">
						{{ i18n.baseText('mcpServers.tools.row.descriptionHint') }}
					</N8nText>
				</div>
			</template>

			<template v-else>
				<div>
					<N8nText tag="p" size="small" color="text-light">
						{{ i18n.baseText('mcpServers.tools.row.toolName') }}
					</N8nText>
					<N8nText tag="p" :class="$style.monoText">{{ tool.toolName }}</N8nText>
				</div>
				<div>
					<N8nText tag="p" size="small" color="text-light">
						{{ i18n.baseText('mcpServers.tools.row.description') }}
					</N8nText>
					<N8nText tag="p" :class="$style.readonlyDescription">
						{{ tool.description || i18n.baseText('mcpServers.tools.row.noDescription') }}
					</N8nText>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.row {
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);

	&.warning {
		border-color: var(--border-color--warning);
	}
}

.summary {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: none;
	background: none;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
	border-radius: var(--radius);

	&:hover .chevron {
		color: var(--text-color);
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.expanded .summary {
	border-bottom: var(--border);
	border-radius: var(--radius) var(--radius) 0 0;
}

.summaryText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.nameLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.name {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.description {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.missing {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--xs);
	color: var(--text-color--warning);
}

.chevron {
	flex: none;
	color: var(--text-color--subtle);
}

.editor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}

.sourceLine {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	min-height: var(--spacing--lg);
}

.hint {
	margin-top: var(--spacing--4xs);
}

.mono :global(input),
.monoText {
	font-family: var(--font-family--monospace);
}

.resizable :global(textarea) {
	resize: vertical;
}

.readonlyDescription {
	white-space: pre-wrap;
}
</style>
