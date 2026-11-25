<script setup lang="ts">
import {
	MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH,
	MCP_SERVER_TOOL_NAME_MAX_LENGTH,
	mcpServerToolNameSchema,
	type McpServerToolDraftField,
	type McpServerToolResponse,
	type UpdateMcpServerToolDto,
} from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

// One tool of a server. Collapsed: the name and the description. Expanded: the source link, the
// tool name, the description, and a menu with "Remove". A field saves when it loses focus. With
// the n8n Assistant, a "Generate" button below each field writes that field again.
const props = defineProps<{
	tool: McpServerToolResponse;
	canUpdate: boolean;
	/** The builder can edit, and the n8n Assistant can write drafts. */
	canGenerate?: boolean;
	/** The first draft after the add runs. The row shows a loading line instead of the text. */
	drafting?: boolean;
	/** The fields for which a "Generate" call runs. */
	generating?: McpServerToolDraftField[];
	/** The URL of the source workflow, which opens in a new tab. */
	workflowHref: string | null;
	/** Open the row on mount, for a deep link. */
	initiallyExpanded?: boolean;
	/** The Assistant added the tool. The row shows a short highlight. */
	highlighted?: boolean;
}>();

const emit = defineEmits<{
	update: [changes: UpdateMcpServerToolDto];
	remove: [];
	generate: [field: McpServerToolDraftField];
}>();

const i18n = useI18n();
const expanded = ref(props.initiallyExpanded ?? false);
const toolName = ref(props.tool.toolName);
const description = ref(props.tool.description);

/** The field that the builder types in. A new tool object does not reset it. */
const editing = ref<McpServerToolDraftField | null>(null);

// A save, a failed save, or a draft gives a new tool object. A field takes the server text when
// that text changed, or when the builder does not type in it, so a failed save resets it.
watch(
	() => props.tool,
	(tool, previous) => {
		if (tool.toolName !== previous.toolName || editing.value !== 'toolName') {
			toolName.value = tool.toolName;
		}
		if (tool.description !== previous.description || editing.value !== 'description') {
			description.value = tool.description;
		}
	},
);

// A broken tool has no published workflow to read, so the server refuses its draft.
const showGenerate = computed(() => !!props.canGenerate && !props.tool.brokenReason);
const nameInvalid = computed(() => !mcpServerToolNameSchema.safeParse(toolName.value).success);
const missingDescription = computed(() => !props.drafting && props.tool.description.trim() === '');

function isGenerating(field: McpServerToolDraftField) {
	return props.generating?.includes(field) ?? false;
}

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
	editing.value = null;
	if (nameInvalid.value || toolName.value === props.tool.toolName) return;
	emit('update', { toolName: toolName.value });
}

function saveDescription() {
	editing.value = null;
	const value = description.value.trim();
	if (value === props.tool.description) return;
	emit('update', { description: value });
}
</script>

<template>
	<div
		:class="[
			$style.row,
			{
				[$style.expanded]: expanded,
				[$style.warning]: !!tool.brokenReason,
				[$style.highlighted]: highlighted,
			},
		]"
		data-test-id="mcp-tool-row"
		:data-highlighted="String(!!highlighted)"
		:data-tool-name="tool.toolName"
	>
		<div v-if="drafting && !expanded" :class="$style.drafting" data-test-id="mcp-tool-row-drafting">
			<N8nSpinner size="small" />
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('mcpServers.tools.row.drafting') }}
			</N8nText>
		</div>
		<button
			v-else
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

			<div v-if="drafting" :class="$style.drafting" data-test-id="mcp-tool-row-drafting">
				<N8nSpinner size="small" />
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('mcpServers.tools.row.drafting') }}
				</N8nText>
			</div>

			<template v-else-if="canUpdate">
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
							:disabled="isGenerating('toolName')"
							data-test-id="mcp-tool-row-name-input"
							@focus="editing = 'toolName'"
							@blur="saveName"
						>
							<template v-if="isGenerating('toolName')" #suffix>
								<N8nSpinner size="small" data-test-id="mcp-tool-row-generating-name" />
							</template>
						</N8nInput>
					</N8nInputLabel>
					<div :class="$style.fieldFooter">
						<N8nText
							v-if="nameInvalid"
							tag="p"
							size="small"
							color="danger"
							data-test-id="mcp-tool-row-name-error"
						>
							{{ i18n.baseText('mcpServers.tools.row.toolNameInvalid') }}
						</N8nText>
						<N8nText v-else tag="p" size="small" color="text-light">
							{{ i18n.baseText('mcpServers.tools.row.toolNameHint') }}
						</N8nText>
						<N8nButton
							v-if="showGenerate"
							variant="ghost"
							size="xsmall"
							:label="i18n.baseText('mcpServers.tools.row.generate')"
							:disabled="isGenerating('toolName')"
							:class="$style.generate"
							data-test-id="mcp-tool-row-generate-name"
							data-attr="mcp-tool-row-generate-name"
							@click="emit('generate', 'toolName')"
						/>
					</div>
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
							:disabled="isGenerating('description')"
							:maxlength="MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH"
							:class="$style.resizable"
							data-test-id="mcp-tool-row-description-input"
							@focus="editing = 'description'"
							@blur="saveDescription"
						>
							<template v-if="isGenerating('description')" #suffix>
								<N8nSpinner
									size="small"
									:class="$style.textareaSpinner"
									data-test-id="mcp-tool-row-generating-description"
								/>
							</template>
						</N8nInput>
					</N8nInputLabel>
					<div :class="$style.fieldFooter">
						<N8nText v-if="missingDescription" tag="p" size="small" color="warning">
							{{ i18n.baseText('mcpServers.tools.row.missingDescription') }}
						</N8nText>
						<N8nText v-else tag="p" size="small" color="text-light">
							{{ i18n.baseText('mcpServers.tools.row.descriptionHint') }}
						</N8nText>
						<N8nButton
							v-if="showGenerate"
							variant="ghost"
							size="xsmall"
							:label="i18n.baseText('mcpServers.tools.row.generate')"
							:disabled="isGenerating('description')"
							:class="$style.generate"
							data-test-id="mcp-tool-row-generate-description"
							data-attr="mcp-tool-row-generate-description"
							@click="emit('generate', 'description')"
						/>
					</div>
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

	&.highlighted {
		animation: highlight var(--duration--slowest) ease-out;
	}
}

@keyframes highlight {
	from {
		background-color: var(--background--success);
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

.drafting {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	min-height: var(--height--3xl);
}

.editor .drafting {
	padding: 0;
	min-height: auto;
}

// The helper text on the left, "Generate" on the right, directly below the field.
.fieldFooter {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--4xs);

	// "Generate": a small text button with no border and no background. Two classes, to win
	// over the size and variant classes of N8nButton.
	.generate {
		--button--color: var(--text-color--subtle);
		--button--color--background-hover: transparent;
		--button--color--background-active: transparent;
		--button--padding: 0;
		flex: none;
		font-style: italic;
		font-weight: var(--font-weight--regular);

		&:hover:not(:disabled) {
			--button--color: var(--text-color);
		}
	}
}

// The spinner sits in the top-right corner of the description while "Generate" runs.
.textareaSpinner {
	margin: var(--spacing--xs) var(--spacing--xs) 0 0;
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
