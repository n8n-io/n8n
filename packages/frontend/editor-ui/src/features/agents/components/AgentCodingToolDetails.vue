<script setup lang="ts">
import { N8nBadge } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import { computed, defineAsyncComponent, inject, ref } from 'vue';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { useFollowScroll } from '../composables/useFollowScroll';
import { CODING_OPEN_FILE } from '../utils/coding-review';
import { parseCodingEdit } from '../utils/coding-tool-step';

const CodeViewer = defineAsyncComponent(async () => await import('./AgentCustomToolViewer.vue'));
const MAX_SHOWN_CHARACTERS = 12000;
const EDIT_SIGNS = { added: '+', removed: '−', context: ' ' };

const props = defineProps<{ toolCall: ToolCall }>();
const i18n = useI18n();
const openFile = inject(CODING_OPEN_FILE);
const input = computed(() => (isRecord(props.toolCall.input) ? props.toolCall.input : {}));
const output = computed(() => (isRecord(props.toolCall.output) ? props.toolCall.output : {}));
const path = computed(() => (typeof input.value.path === 'string' ? input.value.path : ''));
const command = computed(() =>
	typeof input.value.command === 'string' ? input.value.command : '',
);
const isWrite = computed(() => props.toolCall.tool === 'workspace_write_file');
const edit = computed(() =>
	props.toolCall.tool === 'workspace_str_replace_file'
		? parseCodingEdit(props.toolCall.input)
		: undefined,
);
const contentLabel = computed<BaseTextKey>(() => {
	if (edit.value) return 'agents.coding.changes';
	return isWrite.value ? 'agents.coding.tools.written' : 'agents.coding.tools.read';
});
const content = computed(() => {
	const value = isWrite.value ? input.value.content : output.value.content;
	return typeof value === 'string' ? value : '';
});
const commandOutput = computed(() =>
	[output.value.stdout, output.value.stderr]
		.filter((value): value is string => typeof value === 'string' && value.length > 0)
		.join('\n'),
);
const exitCode = computed(() =>
	typeof output.value.exitCode === 'number' ? output.value.exitCode : undefined,
);
const outputElement = ref<HTMLElement>();
useFollowScroll(outputElement, commandOutput);
</script>

<template>
	<div :class="$style.details">
		<template v-if="path">
			<button
				type="button"
				:class="$style.file"
				:title="path"
				:aria-label="i18n.baseText('agents.coding.tools.openFile', { interpolate: { path } })"
				data-testid="agent-coding-tool-path"
				@click="openFile?.(path)"
			>
				{{ path }}
			</button>
			<div :class="$style.header">
				<span :class="$style.label">{{ i18n.baseText(contentLabel) }}</span>
				<span v-if="edit" :class="$style.stats" data-testid="agent-coding-tool-stats"
					><span :class="$style.additions">+{{ edit.stats.additions }}</span>
					<span :class="$style.deletions">−{{ edit.stats.deletions }}</span></span
				>
			</div>
			<div v-if="edit" :class="$style.output" data-testid="agent-coding-tool-edit">
				<div v-for="(lines, index) in edit.replacements" :key="index" :class="$style.replacement">
					<div
						v-for="(line, lineIndex) in lines"
						:key="lineIndex"
						:class="[$style.editLine, $style[line.kind]]"
						:data-kind="line.kind"
					>
						<span :class="$style.sign">{{ EDIT_SIGNS[line.kind] }}</span
						><code>{{ line.text }}</code>
					</div>
				</div>
			</div>
			<template v-else>
				<CodeViewer
					v-if="content"
					:code="content.slice(0, MAX_SHOWN_CHARACTERS)"
					:class="$style.code"
				/>
				<span v-if="content.length > MAX_SHOWN_CHARACTERS" :class="$style.label">{{
					i18n.baseText('agents.coding.tools.truncated')
				}}</span>
			</template>
		</template>
		<template v-else-if="command">
			<div :class="$style.header">
				<span :class="$style.label">{{ i18n.baseText('agents.coding.tools.command') }}</span>
				<N8nBadge
					v-if="exitCode !== undefined"
					:variant="exitCode === 0 ? 'success' : 'danger'"
					size="xsmall"
					data-testid="agent-coding-tool-exit-code"
					>{{
						i18n.baseText('agents.coding.tools.exitCode', {
							interpolate: { code: String(exitCode) },
						})
					}}</N8nBadge
				>
			</div>
			<pre :class="$style.output">$ {{ command }}</pre>
			<template v-if="commandOutput">
				<span :class="$style.label">{{ i18n.baseText('agents.coding.tools.output') }}</span>
				<pre ref="outputElement" :class="$style.output" data-testid="agent-coding-tool-output">{{
					commandOutput.slice(-MAX_SHOWN_CHARACTERS)
				}}</pre>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}
/* The path is the header of the details, so it lines up with the labels below it. */
.file {
	align-self: flex-start;
	max-width: 100%;
	padding: 0;
	border: 0;
	border-radius: var(--radius--3xs);
	background: none;
	color: var(--text-color);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	text-align: left;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	cursor: pointer;

	&:hover {
		text-decoration: underline;
	}

	@include focus.focus-visible-ring;
}
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.label {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}
.stats {
	display: inline-flex;
	gap: var(--spacing--4xs);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}
.additions {
	color: var(--text-color--success);
}
.deletions {
	color: var(--text-color--danger);
}
.code {
	height: calc(var(--spacing--xl) * 8);
	border: var(--border-width) solid var(--border-color);
	border-radius: var(--radius--sm);
	overflow: hidden;
}
.output {
	margin: 0;
	padding: var(--spacing--xs);
	max-height: calc(var(--spacing--xl) * 8);
	overflow: auto;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	background: var(--background--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	tab-size: 4;
}
.replacement + .replacement {
	margin-top: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}
.editLine {
	display: flex;
	gap: var(--spacing--3xs);

	code {
		font: inherit;
	}
}
.sign {
	flex-shrink: 0;
	user-select: none;
}
.added {
	background: var(--background--success);
	color: var(--text-color--success);
}
.removed {
	background: var(--background--danger);
	color: var(--text-color--danger);
}
.context {
	color: var(--text-color--subtle);
}
</style>
