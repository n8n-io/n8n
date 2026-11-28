<script setup lang="ts">
import {
	MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH,
	type McpServerToolDetailResponse,
	type McpServerToolResponse,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nLoading,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

// Body of the tool modal for a workflow tool: warning callout, description with Generate,
// source workflow line with Open workflow, open Inputs section, and read-only Output section.
const props = defineProps<{
	tool: McpServerToolResponse;
	detail: McpServerToolDetailResponse | null;
	detailLoading: boolean;
	detailError: boolean;
	canUpdate: boolean;
	showGenerate: boolean;
	drafting: boolean;
	generatingDescription: boolean;
	workflowHref: string | null;
}>();

const description = defineModel<string>('description', { required: true });

const emit = defineEmits<{
	'generate-description': [];
	'retry-detail': [];
}>();

const i18n = useI18n();

const missingDescription = computed(() => !props.drafting && description.value.trim().length === 0);
const canOpenWorkflow = computed(
	() =>
		Boolean(props.workflowHref) &&
		props.tool.brokenReason !== 'deleted' &&
		props.tool.brokenReason !== 'moved',
);
const sourceText = computed(() =>
	props.detail?.sourceName
		? i18n.baseText('mcpServers.tools.modal.fromWorkflow', {
				interpolate: { name: props.detail.sourceName },
			})
		: i18n.baseText('mcpServers.tools.row.fromWorkflow'),
);
const inputs = computed(() => props.detail?.inputs ?? []);
const outputs = computed(() => props.detail?.outputs ?? null);
</script>

<template>
	<div :class="$style.container">
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

		<template v-else>
			<div v-if="canUpdate" :class="$style.section">
				<N8nInputLabel
					:label="i18n.baseText('mcpServers.tools.row.description')"
					:bold="false"
					size="small"
				>
					<N8nInput
						v-model="description"
						type="textarea"
						:rows="3"
						:disabled="generatingDescription"
						:maxlength="MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH"
						:class="$style.resizable"
						data-test-id="mcp-tool-dialog-description-input"
					>
						<template v-if="generatingDescription" #suffix>
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
						:disabled="generatingDescription"
						:class="$style.generate"
						data-test-id="mcp-tool-dialog-generate-description"
						data-attr="mcp-tool-dialog-generate-description"
						@click="emit('generate-description')"
					/>
				</div>
			</div>

			<div v-else :class="$style.section">
				<N8nText tag="p" size="small" bold>
					{{ i18n.baseText('mcpServers.tools.row.description') }}
				</N8nText>
				<N8nText
					tag="p"
					size="small"
					:color="tool.description ? 'text-dark' : 'text-light'"
					:class="$style.readonlyDescription"
					data-test-id="mcp-tool-dialog-description-readonly"
				>
					{{ tool.description || i18n.baseText('mcpServers.tools.row.noDescription') }}
				</N8nText>
			</div>
		</template>

		<div v-if="canOpenWorkflow" :class="$style.sourceLine" data-test-id="mcp-tool-dialog-source">
			<N8nText size="small" color="text-light" :class="$style.sourceLabel">
				{{ sourceText }}
			</N8nText>
			<N8nLink
				:to="workflowHref!"
				new-window
				size="small"
				:class="$style.openWorkflow"
				data-test-id="mcp-tool-dialog-source-link"
				data-attr="mcp-tool-dialog-open-workflow"
			>
				{{ i18n.baseText('mcpServers.tools.modal.openWorkflow') }}
				<N8nIcon icon="external-link" size="xsmall" />
			</N8nLink>
		</div>

		<section :class="$style.section" data-test-id="mcp-tool-dialog-inputs-section">
			<N8nText tag="h4" size="small" bold>
				{{ i18n.baseText('mcpServers.tools.modal.inputs.title') }}
			</N8nText>

			<N8nLoading v-if="detailLoading" :rows="2" data-test-id="mcp-tool-dialog-inputs-loading" />
			<div
				v-else-if="detailError"
				:class="$style.errorRow"
				data-test-id="mcp-tool-dialog-detail-error"
			>
				<N8nText size="small" color="danger" role="alert">
					{{ i18n.baseText('mcpServers.tools.modal.detailLoadError') }}
				</N8nText>
				<N8nButton
					variant="ghost"
					size="xsmall"
					:label="i18n.baseText('mcpServers.tools.modal.retry')"
					data-test-id="mcp-tool-dialog-detail-retry"
					@click="emit('retry-detail')"
				/>
			</div>
			<N8nText
				v-else-if="inputs.length === 0"
				size="small"
				color="text-light"
				data-test-id="mcp-tool-dialog-inputs-empty"
			>
				{{ i18n.baseText('mcpServers.tools.modal.inputs.empty') }}
			</N8nText>
			<div v-else :class="$style.fieldList" role="list" data-test-id="mcp-tool-dialog-inputs">
				<div
					v-for="field in inputs"
					:key="field.name"
					role="listitem"
					:class="$style.fieldRow"
					data-test-id="mcp-tool-dialog-input-row"
				>
					<N8nText size="small" :class="$style.fieldName" data-test-id="mcp-tool-dialog-input-name">
						{{ field.name }}
					</N8nText>
					<N8nBadge theme="tertiary" size="small" data-test-id="mcp-tool-dialog-input-type">
						{{ field.type }}
					</N8nBadge>
				</div>
			</div>
		</section>

		<section
			v-if="!detailError"
			:class="$style.section"
			data-test-id="mcp-tool-dialog-outputs-section"
		>
			<N8nText tag="h4" size="small" bold>
				{{ i18n.baseText('mcpServers.tools.modal.outputs.title') }}
			</N8nText>

			<N8nLoading v-if="detailLoading" :rows="2" data-test-id="mcp-tool-dialog-outputs-loading" />
			<N8nText
				v-else-if="outputs === null"
				size="small"
				color="text-light"
				data-test-id="mcp-tool-dialog-outputs-no-execution"
			>
				{{ i18n.baseText('mcpServers.tools.modal.outputs.noExecution') }}
			</N8nText>
			<N8nText
				v-else-if="outputs.length === 0"
				size="small"
				color="text-light"
				data-test-id="mcp-tool-dialog-outputs-empty"
			>
				{{ i18n.baseText('mcpServers.tools.modal.outputs.empty') }}
			</N8nText>
			<div v-else :class="$style.fieldList" role="list" data-test-id="mcp-tool-dialog-outputs">
				<div
					v-for="field in outputs"
					:key="field.name"
					role="listitem"
					:class="$style.fieldRow"
					data-test-id="mcp-tool-dialog-output-row"
				>
					<N8nText
						size="small"
						:class="$style.fieldName"
						data-test-id="mcp-tool-dialog-output-name"
					>
						{{ field.name }}
					</N8nText>
					<N8nBadge theme="tertiary" size="small" data-test-id="mcp-tool-dialog-output-type">
						{{ field.type }}
					</N8nBadge>
				</div>
			</div>
		</section>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.drafting {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.sourceLine {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
}

.sourceLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.openWorkflow {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.fieldFooter {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);

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

.resizable :global(textarea) {
	resize: vertical;
}

.readonlyDescription {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.errorRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.fieldList {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius);
}

.fieldRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);

	& + & {
		border-top: var(--border);
	}
}

.fieldName {
	font-family: var(--font-family--monospace);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
