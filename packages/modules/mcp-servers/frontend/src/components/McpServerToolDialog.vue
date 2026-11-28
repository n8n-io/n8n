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
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

// Bridge tool modal until CONTEXT-602 adds the full inputs and outputs modal.
const props = defineProps<{
	tool: McpServerToolResponse | null;
	canUpdate: boolean;
	/** The builder can edit, and the n8n Assistant can write drafts. */
	canGenerate?: boolean;
	/** The first draft after the add runs. */
	drafting?: boolean;
	/** The fields for which a "Generate" call runs. */
	generating?: McpServerToolDraftField[];
	/** The URL of the source workflow, which opens in a new tab. */
	workflowHref: string | null;
}>();

const emit = defineEmits<{
	close: [];
	update: [changes: UpdateMcpServerToolDto];
	remove: [];
	generate: [field: McpServerToolDraftField];
}>();

const i18n = useI18n();
const toolName = ref('');
const description = ref('');

/** The field that the builder types in. A new tool object does not reset it. */
const editing = ref<McpServerToolDraftField | null>(null);

watch(
	() => props.tool,
	(tool, previous) => {
		if (!tool) {
			editing.value = null;
			return;
		}
		const switched = !previous || tool.id !== previous.id;
		if (switched) editing.value = null;
		if (switched || tool.toolName !== previous.toolName || editing.value !== 'toolName') {
			toolName.value = tool.toolName;
		}
		if (switched || tool.description !== previous.description || editing.value !== 'description') {
			description.value = tool.description;
		}
	},
	{ immediate: true },
);

const open = computed({
	get: () => props.tool !== null,
	set: (value: boolean) => {
		if (!value) emit('close');
	},
});

// A broken tool has no published workflow to read, so the server refuses its draft.
const showGenerate = computed(() => !!props.canGenerate && !props.tool?.brokenReason);
const nameInvalid = computed(() => !mcpServerToolNameSchema.safeParse(toolName.value).success);
const missingDescription = computed(
	() => !props.drafting && (props.tool?.description.trim() ?? '') === '',
);

function isGenerating(field: McpServerToolDraftField) {
	return props.generating?.includes(field) ?? false;
}

function saveName() {
	editing.value = null;
	if (!props.tool || nameInvalid.value || toolName.value === props.tool.toolName) return;
	emit('update', { toolName: toolName.value });
}

function saveDescription() {
	editing.value = null;
	if (!props.tool) return;
	const value = description.value.trim();
	if (value === props.tool.description) return;
	emit('update', { description: value });
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="tool?.toolName ?? ''"
		:aria-description="i18n.baseText('mcpServers.tools.dialog.ariaDescription')"
		size="medium"
		data-test-id="mcp-tool-dialog"
	>
		<N8nDialogBody v-if="tool" :class="$style.body">
			<div v-if="workflowHref" :class="$style.sourceLine">
				<N8nLink
					:to="workflowHref"
					new-window
					size="small"
					data-test-id="mcp-tool-dialog-source-link"
				>
					{{ i18n.baseText('mcpServers.tools.row.fromWorkflow') }}
					<N8nIcon icon="external-link" size="xsmall" />
				</N8nLink>
			</div>

			<N8nCallout
				v-if="tool.brokenReason"
				theme="warning"
				data-test-id="mcp-tool-dialog-broken-callout"
			>
				{{ i18n.baseText(`mcpServers.tools.broken.callout.${tool.brokenReason}`) }}
			</N8nCallout>

			<div v-if="drafting" :class="$style.drafting" data-test-id="mcp-tool-dialog-drafting">
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
							data-test-id="mcp-tool-dialog-name-input"
							@focus="editing = 'toolName'"
							@blur="saveName"
						>
							<template v-if="isGenerating('toolName')" #suffix>
								<N8nSpinner size="small" data-test-id="mcp-tool-dialog-generating-name" />
							</template>
						</N8nInput>
					</N8nInputLabel>
					<div :class="$style.fieldFooter">
						<N8nText
							v-if="nameInvalid"
							tag="p"
							size="small"
							color="danger"
							data-test-id="mcp-tool-dialog-name-error"
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
							data-test-id="mcp-tool-dialog-generate-name"
							data-attr="mcp-tool-dialog-generate-name"
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
						<N8nInput
							v-model="description"
							type="textarea"
							:rows="3"
							:disabled="isGenerating('description')"
							:maxlength="MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH"
							:class="$style.resizable"
							data-test-id="mcp-tool-dialog-description-input"
							@focus="editing = 'description'"
							@blur="saveDescription"
						>
							<template v-if="isGenerating('description')" #suffix>
								<N8nSpinner
									size="small"
									:class="$style.textareaSpinner"
									data-test-id="mcp-tool-dialog-generating-description"
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
							data-test-id="mcp-tool-dialog-generate-description"
							data-attr="mcp-tool-dialog-generate-description"
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
		</N8nDialogBody>

		<N8nDialogFooter :class="$style.footer">
			<N8nButton
				v-if="canUpdate"
				variant="ghost"
				icon="trash-2"
				:label="i18n.baseText('mcpServers.tools.row.remove')"
				data-test-id="mcp-tool-dialog-remove"
				data-attr="mcp-tool-dialog-remove"
				@click="emit('remove')"
			/>
			<N8nButton
				variant="outline"
				:class="$style.closeButton"
				:label="i18n.baseText('generic.close')"
				data-test-id="mcp-tool-dialog-close"
				@click="emit('close')"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.sourceLine {
	display: flex;
	align-items: center;
}

.drafting {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

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

.footer {
	justify-content: space-between;
}

.closeButton {
	margin-inline-start: auto;
}
</style>
