<script lang="ts" setup>
import type { ExecutionSearchMatch } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

/** Shows why a search found an execution: the node, the field and the matching text. */
const props = defineProps<{
	match: ExecutionSearchMatch;
	/** Put the matching text on its own line. For lists that are not wide. */
	stacked?: boolean;
}>();

const i18n = useI18n();

const location = computed(() => {
	const { nodeName, source, path } = props.match;
	if (path === undefined) return nodeName;

	return i18n.baseText(
		source === 'input' ? 'executionsSearch.match.inInput' : 'executionsSearch.match.inOutput',
		{ interpolate: { node: nodeName, path } },
	);
});

const snippetText = computed(() => {
	const { snippet } = props.match;
	return snippet ? `${snippet.before}${snippet.match}${snippet.after}` : '';
});
</script>

<template>
	<div
		:class="[$style.match, { [$style.stacked]: stacked }]"
		:title="[location, snippetText].filter(Boolean).join('\n')"
		data-test-id="execution-search-match"
	>
		<span :class="$style.location">
			<N8nIcon icon="search" size="xsmall" />
			{{ location }}
		</span>
		<span v-if="match.snippet" :class="$style.snippet">
			{{ match.snippet.before }}<mark>{{ match.snippet.match }}</mark
			>{{ match.snippet.after }}
		</span>
	</div>
</template>

<style module lang="scss">
.match {
	display: flex;
	gap: var(--spacing--2xs);
	min-width: 0;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
}

.stacked {
	flex-direction: column;
	gap: 0;
}

.location,
.snippet {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.location {
	flex: 0 1 auto;
	color: var(--color--text);
}

.snippet {
	flex: 1 1 0;
}

.stacked .snippet {
	flex: 0 1 auto;
}
</style>
