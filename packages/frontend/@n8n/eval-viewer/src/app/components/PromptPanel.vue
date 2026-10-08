<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import type { ToolDefinition } from '../../schema';
import { formatNumber } from '../format';

/** The system prompt and tool definitions of one attempt, with the matches of `query` marked. */
const props = defineProps<{
	systemPrompt: string | null;
	tools: ToolDefinition[];
	query: string;
}>();

interface Part {
	text: string;
	hit: boolean;
}

const pattern = computed(() => {
	const query = props.query.trim();
	return query ? new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi') : null;
});

/** With a capture group, `split` keeps the matches at the odd indexes. */
const partsOf = (text: string): Part[] =>
	pattern.value
		? text
				.split(pattern.value)
				.map((part, at) => ({ text: part, hit: at % 2 === 1 }))
				.filter((part) => part.text.length > 0)
		: [{ text, hit: false }];
const hitsOf = (parts: Part[]) => parts.filter((part) => part.hit).length;

const system = computed(() => partsOf(props.systemPrompt ?? ''));
const tools = computed(() =>
	props.tools.map((tool) => {
		const description = partsOf(tool.description);
		const schema = partsOf(JSON.stringify(tool.inputSchema, null, 2));
		return { name: tool.name, description, schema, hits: hitsOf(description) + hitsOf(schema) };
	}),
);
const toolHits = computed(() => tools.value.reduce((sum, tool) => sum + tool.hits, 0));
</script>

<template>
	<div :class="$style.panel" data-test-id="prompt-panel">
		<N8nText v-if="systemPrompt === null" color="text-light">
			No model steps for this attempt: the run-debug page has no section for its thread.
		</N8nText>
		<template v-else>
			<details open :class="$style.section">
				<summary>
					<N8nText size="small" bold>System prompt</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ formatNumber(systemPrompt.length) }} chars
					</N8nText>
					<N8nText v-if="pattern" size="xsmall" :color="hitsOf(system) ? 'warning' : 'success'">
						{{ hitsOf(system) }} matches
					</N8nText>
				</summary>
				<pre
					:class="[$style.text, $style.scroll]"
				><template v-for="(part, at) in system" :key="at"><mark v-if="part.hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></pre>
			</details>
			<details open :class="$style.section">
				<summary>
					<N8nText size="small" bold>Tools ({{ tools.length }})</N8nText>
					<N8nText v-if="pattern" size="xsmall" :color="toolHits ? 'warning' : 'success'">
						{{ toolHits }} matches
					</N8nText>
				</summary>
				<details
					v-for="tool in tools"
					:key="tool.name"
					:open="pattern !== null && tool.hits > 0"
					:class="$style.tool"
				>
					<summary>
						<code :class="$style.name">{{ tool.name }}</code>
						<N8nText v-if="pattern && tool.hits" size="xsmall" color="warning">
							{{ tool.hits }} matches
						</N8nText>
					</summary>
					<pre
						:class="$style.text"
					><template v-for="(part, at) in tool.description" :key="at"><mark v-if="part.hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></pre>
					<N8nText size="xsmall" bold color="text-light">INPUT SCHEMA</N8nText>
					<pre
						:class="$style.text"
					><template v-for="(part, at) in tool.schema" :key="at"><mark v-if="part.hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></pre>
				</details>
			</details>
		</template>
	</div>
</template>

<style module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.section,
.tool {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.section > summary,
.tool > summary {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	cursor: pointer;
}

.tool {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--md);
	margin-top: var(--spacing--4xs);
}

.name {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
}

.text {
	margin: var(--spacing--3xs) 0 0;
	padding: var(--spacing--2xs);
	border-radius: var(--radius--md);
	background-color: var(--background--surface);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
}

.scroll {
	max-height: 60dvh;
	overflow-y: auto;
}

.text mark {
	border-radius: var(--radius--sm);
	background-color: var(--color--yellow-300);
	color: var(--color--neutral-950);
}
</style>
