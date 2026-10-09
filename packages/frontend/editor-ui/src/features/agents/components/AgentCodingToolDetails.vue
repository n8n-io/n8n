<script setup lang="ts">
import { N8nBadge, N8nButton, N8nCallout, N8nTooltip, type BadgeVariant } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import { computed, defineAsyncComponent, inject, ref } from 'vue';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { useFollowScroll } from '../composables/useFollowScroll';
import { CODING_OPEN_FILE } from '../utils/coding-review';
import {
	codingCommandExitCode,
	codingStepFailureText,
	codingStepOutcome,
	parseCodingEdit,
	parseCodingEditFailure,
	type CodingEditResultStatus,
} from '../utils/coding-tool-step';

const CodeViewer = defineAsyncComponent(async () => await import('./AgentCustomToolViewer.vue'));
const MAX_SHOWN_CHARACTERS = 12000;
const EDIT_SIGNS = { added: '+', removed: '−', context: ' ' };
const EDIT_RESULTS: Record<CodingEditResultStatus, { text: BaseTextKey; variant: BadgeVariant }> = {
	success: { text: 'agents.coding.tools.changeStatus.success', variant: 'outline' },
	failed: { text: 'agents.coding.tools.changeStatus.failed', variant: 'danger' },
	not_attempted: { text: 'agents.coding.tools.changeStatus.notAttempted', variant: 'outline' },
};

const props = defineProps<{ toolCall: ToolCall }>();
const i18n = useI18n();
const openFile = inject(CODING_OPEN_FILE);
const input = computed(() => (isRecord(props.toolCall.input) ? props.toolCall.input : {}));
const output = computed(() => (isRecord(props.toolCall.output) ? props.toolCall.output : {}));
const path = computed(() => (typeof input.value.path === 'string' ? input.value.path : ''));
const command = computed(() =>
	typeof input.value.command === 'string' ? input.value.command : '',
);
const done = computed(() => codingStepOutcome(props.toolCall) === 'done');
const isWrite = computed(() => props.toolCall.tool === 'workspace_write_file');
const edit = computed(() =>
	props.toolCall.tool === 'workspace_str_replace_file'
		? parseCodingEdit(props.toolCall.input)
		: undefined,
);
// The step label reads the same exit code, so the badge and the label agree.
const exitCode = computed(() => codingCommandExitCode(props.toolCall.output));
// The exit code badge tells how a command ended, so it needs no failure text too.
const failure = computed(() =>
	exitCode.value === undefined ? codingStepFailureText(i18n, props.toolCall) : undefined,
);
const editFailure = computed(() =>
	edit.value ? parseCodingEditFailure(props.toolCall.output) : undefined,
);
/** The changed lines of each replacement, with the result of a replacement that did not apply. */
const editBlocks = computed(() => {
	const results = new Map((editFailure.value?.results ?? []).map((item) => [item.index, item]));
	return (edit.value?.replacements ?? []).map((lines, index) => ({
		lines,
		number: String(index + 1),
		result: results.get(index),
	}));
});
const content = computed(() => {
	const value = isWrite.value ? input.value.content : output.value.content;
	return typeof value === 'string' ? value : '';
});
/** A step that did not finish shows what it asked for, not a result. */
const contentLabel = computed<BaseTextKey | undefined>(() => {
	if (edit.value) {
		return done.value ? 'agents.coding.changes' : 'agents.coding.tools.requestedChanges';
	}
	if (!content.value) return undefined;
	if (!isWrite.value) return 'agents.coding.tools.read';
	return done.value ? 'agents.coding.tools.written' : 'agents.coding.tools.toWrite';
});
const commandOutput = computed(() =>
	[output.value.stdout, output.value.stderr]
		.filter((value): value is string => typeof value === 'string' && value.length > 0)
		.join('\n'),
);
const outputElement = ref<HTMLElement>();
useFollowScroll(outputElement, commandOutput);
</script>

<template>
	<div :class="$style.details">
		<!-- The tooltip shows a long path in full, also on keyboard focus. The slot keeps
		     the path as text, because the `content` prop renders HTML. -->
		<N8nTooltip v-if="path" placement="top-start" as-child>
			<template #content>{{ path }}</template>
			<N8nButton
				variant="ghost"
				size="xsmall"
				:class="$style.file"
				:aria-label="i18n.baseText('agents.coding.tools.openFile', { interpolate: { path } })"
				data-testid="agent-coding-tool-path"
				@click="openFile?.(path)"
			>
				<span :class="$style.fileName">{{ path }}</span>
			</N8nButton>
		</N8nTooltip>
		<N8nCallout v-if="failure" theme="danger" data-testid="agent-coding-tool-failure">
			{{ failure }}
			<template v-if="editFailure">
				{{ i18n.baseText('agents.coding.tools.editNotApplied') }}
			</template>
		</N8nCallout>
		<template v-if="path">
			<div v-if="contentLabel" :class="$style.header">
				<span :class="$style.label">{{ i18n.baseText(contentLabel) }}</span>
				<span v-if="edit && done" :class="$style.stats" data-testid="agent-coding-tool-stats"
					><span :class="$style.additions">+{{ edit.stats.additions }}</span>
					<span :class="$style.deletions">−{{ edit.stats.deletions }}</span></span
				>
			</div>
			<div v-if="edit" :class="$style.output" data-testid="agent-coding-tool-edit">
				<div v-for="block in editBlocks" :key="block.number" :class="$style.replacement">
					<div
						v-if="block.result"
						:class="$style.result"
						data-testid="agent-coding-tool-edit-result"
						:data-status="block.result.status"
					>
						<span>{{
							i18n.baseText('agents.coding.tools.change', {
								interpolate: { number: block.number },
							})
						}}</span>
						<N8nBadge :variant="EDIT_RESULTS[block.result.status].variant" size="xsmall">{{
							i18n.baseText(EDIT_RESULTS[block.result.status].text)
						}}</N8nBadge>
						<span v-if="block.result.error" :class="$style.resultError">{{
							block.result.error
						}}</span>
					</div>
					<div
						v-for="(line, lineIndex) in block.lines"
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
.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}
/* The path is the header of the details. With no padding, it lines up with the labels below it.
   The class is doubled so that it wins over the size class of the button. */
.file.file {
	--button--padding: 0;
	--button--height: auto;
	--button--font-size: var(--font-size--2xs);
	--button--color: var(--text-color);
	--button--color--background-hover: transparent;
	--button--color--background-active: transparent;

	align-self: flex-start;
	max-width: 100%;
	font-family: var(--font-family--monospace);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);

	> * {
		min-width: 0;
		overflow: hidden;
	}

	&:hover .fileName {
		text-decoration: underline;
	}
}
.fileName {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
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
.result {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs) var(--spacing--2xs);
	margin-bottom: var(--spacing--4xs);
	font-family: var(--font-family);
	color: var(--text-color--subtle);
}
.resultError {
	flex-basis: 100%;
	color: var(--text-color--danger);
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
