<script lang="ts" setup>
import { N8nAiActivityStepResultSection } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { highlightCode } from '../codeHighlight';
import type { ExecuteCommandArgsView, ExecuteCommandResultView } from '../toolCommand.utils';

const props = defineProps<{
	command?: ExecuteCommandArgsView;
	result?: ExecuteCommandResultView;
}>();

const i18n = useI18n();

const highlightedCommand = computed(() =>
	props.command ? highlightCode(props.command.command, 'bash') : undefined,
);

const statusLabel = computed(() => {
	const result = props.result;
	if (!result) return undefined;

	const parts: string[] = [];
	if (result.exitCode !== undefined) {
		parts.push(
			i18n.baseText('instanceAi.toolCommand.exitCode', {
				interpolate: { code: String(result.exitCode) },
			}),
		);
	}
	if (result.executionTimeMs !== undefined) {
		parts.push(
			i18n.baseText('instanceAi.toolCommand.duration', {
				interpolate: { ms: String(result.executionTimeMs) },
			}),
		);
	}
	return parts.length > 0 ? parts.join(' · ') : undefined;
});

const failed = computed(() => {
	const result = props.result;
	if (!result) return false;
	if (result.success === false) return true;
	return result.exitCode !== undefined && result.exitCode !== 0;
});
</script>

<template>
	<N8nAiActivityStepResultSection>
		<div :class="$style.root" data-test-id="tool-command-view">
			<div v-if="props.command" :class="$style.panel" data-test-id="tool-command-input">
				<div :class="$style.commandRow">
					<span :class="$style.prompt">$</span>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<pre
						v-if="highlightedCommand"
						:class="[$style.command, 'hljs']"
						v-html="highlightedCommand"
					/>
					<pre v-else :class="$style.command">{{ props.command.command }}</pre>
				</div>
				<div v-if="props.command.cwd" :class="$style.cwd">
					{{ i18n.baseText('instanceAi.toolCommand.cwd') }}
					<span :class="$style.cwdPath">{{ props.command.cwd }}</span>
				</div>
			</div>

			<div
				v-if="props.result"
				:class="[$style.panel, failed && $style.panelFailed]"
				data-test-id="tool-command-result"
			>
				<div v-if="statusLabel" :class="[$style.status, failed && $style.statusFailed]">
					{{ statusLabel }}
				</div>
				<pre v-if="props.result.stdout" :class="$style.stream" data-test-id="tool-command-stdout">{{
					props.result.stdout
				}}</pre>
				<div v-if="props.result.stderr" :class="$style.stderrBlock">
					<div :class="$style.stderrLabel">
						{{ i18n.baseText('instanceAi.toolCommand.stderr') }}
					</div>
					<pre :class="$style.stderr" data-test-id="tool-command-stderr">{{
						props.result.stderr
					}}</pre>
				</div>
				<pre
					v-if="!props.result.stdout && !props.result.stderr"
					:class="$style.stream"
					data-test-id="tool-command-empty"
					>{{ i18n.baseText('instanceAi.toolCommand.noOutput') }}</pre
				>
			</div>
		</div>
	</N8nAiActivityStepResultSection>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.panel {
	max-height: 320px;
	overflow: auto;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background);
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.panelFailed {
	border-color: var(--color--danger--tint-1);
}

.commandRow {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: var(--spacing--3xs);
	align-items: start;
}

.prompt {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	user-select: none;
	line-height: var(--line-height--xl);
}

.command {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	color: var(--color--text--tint-1);
	background: transparent;
}

.cwd {
	margin-top: var(--spacing--3xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
}

.cwdPath {
	font-family: var(--font-family--monospace);
	color: var(--color--text--tint-1);
	word-break: break-all;
}

.status {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	margin-bottom: var(--spacing--3xs);
}

.statusFailed {
	color: var(--color--danger);
}

.stream {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	color: var(--color--text--tint-1);
}

.stderrBlock {
	margin-top: var(--spacing--2xs);
}

.stderrLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--danger);
	margin-bottom: var(--spacing--4xs);
}

.stderr {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	color: var(--color--danger);
}
</style>
