<script setup lang="ts">
import { N8nCodeBlock, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

/** Shows a tool input or output: top-level fields one by one, long strings as code. */
const props = defineProps<{ value: unknown; fieldName?: string; nested?: boolean }>();

const CODE_KEY = /code|source|script|typescript|\.ts$/i;
const LONG_TEXT = 160;

type View =
	| { kind: 'none' }
	| { kind: 'inline'; text: string }
	| { kind: 'text'; text: string }
	| { kind: 'code'; text: string; language: 'json' | 'typescript' }
	| { kind: 'fields'; fields: Array<[string, unknown]> };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

function parsesAsJson(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
	try {
		JSON.parse(trimmed);
		return true;
	} catch {
		return false;
	}
}

const view = computed((): View => {
	const value = props.value;
	if (value === undefined) return { kind: 'none' };
	if (typeof value === 'string') {
		if (value.length < LONG_TEXT && !value.includes('\n')) return { kind: 'inline', text: value };
		if (props.fieldName && CODE_KEY.test(props.fieldName)) {
			return { kind: 'code', text: value, language: 'typescript' };
		}
		if (parsesAsJson(value)) {
			return {
				kind: 'code',
				text: JSON.stringify(JSON.parse(value), null, 2),
				language: 'json',
			};
		}
		return { kind: 'text', text: value };
	}
	if (typeof value !== 'object' || value === null) {
		return { kind: 'inline', text: JSON.stringify(value) ?? typeof value };
	}
	if (!props.nested && isRecord(value) && Object.keys(value).length > 0) {
		return { kind: 'fields', fields: Object.entries(value) };
	}
	return { kind: 'code', text: JSON.stringify(value, null, 2), language: 'json' };
});
</script>

<template>
	<N8nText v-if="view.kind === 'none'" size="small" color="text-light">none</N8nText>
	<code v-else-if="view.kind === 'inline'" :class="$style.inline">{{ view.text }}</code>
	<pre v-else-if="view.kind === 'text'" :class="$style.text">{{ view.text }}</pre>
	<N8nCodeBlock
		v-else-if="view.kind === 'code'"
		:code="view.text"
		:language="view.language"
		:max-height="420"
	/>
	<dl v-else :class="$style.fields">
		<template v-for="[key, field] in view.fields" :key="key">
			<dt>
				<N8nText size="xsmall" bold color="text-light">{{ key }}</N8nText>
			</dt>
			<dd><ValueBlock :value="field" :field-name="key" nested /></dd>
		</template>
	</dl>
</template>

<style module>
.inline {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	word-break: break-word;
}

.text {
	margin: 0;
	padding: var(--spacing--2xs);
	max-height: var(--spacing--5xl);
	overflow: auto;
	background-color: var(--background--subtle);
	border-radius: var(--radius--sm);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	white-space: pre-wrap;
	word-break: break-word;
}

.fields {
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.fields dd {
	margin: 0 0 var(--spacing--2xs);
	min-width: 0;
}
</style>
