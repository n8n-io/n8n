<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import { computed, defineAsyncComponent, inject } from 'vue';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { CODING_OPEN_FILE } from '../utils/coding-review';

const CodeViewer = defineAsyncComponent(async () => await import('./AgentCustomToolViewer.vue'));
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
</script>

<template>
	<div :class="$style.details">
		<template v-if="path">
			<N8nButton
				variant="ghost"
				size="small"
				:class="$style.file"
				:aria-label="i18n.baseText('agents.coding.tools.openFile', { interpolate: { path } })"
				@click="openFile?.(path)"
			>
				{{ path }}
			</N8nButton>
			<span :class="$style.label">{{
				i18n.baseText(isWrite ? 'agents.coding.tools.written' : 'agents.coding.tools.read')
			}}</span>
			<CodeViewer v-if="content" :code="content.slice(0, 12000)" :class="$style.code" />
			<span v-if="content.length > 12000" :class="$style.label">{{
				i18n.baseText('agents.coding.tools.truncated')
			}}</span>
		</template>
		<template v-else>
			<span :class="$style.label">{{ i18n.baseText('agents.coding.tools.command') }}</span>
			<pre :class="$style.output">$ {{ command }}</pre>
			<span
				v-if="exitCode !== undefined"
				:class="[$style.label, { [$style.failed]: exitCode !== 0 }]"
				>{{
					i18n.baseText('agents.coding.tools.exitCode', { interpolate: { code: String(exitCode) } })
				}}</span
			>
			<template v-if="commandOutput">
				<span :class="$style.label">{{ i18n.baseText('agents.coding.tools.output') }}</span>
				<pre :class="$style.output">{{ commandOutput.slice(-12000) }}</pre>
			</template>
		</template>
	</div>
</template>

<style module>
.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}
.file {
	align-self: flex-start;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}
.label {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
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
	font-size: var(--font-size--2xs);
}
.failed {
	color: var(--color--danger);
}
</style>
