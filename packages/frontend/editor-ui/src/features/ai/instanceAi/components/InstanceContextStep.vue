<script lang="ts" setup>
/**
 * The trace row for what a turn was handed before it started.
 *
 * Its reason for existing is that the block is stripped from the visible message, so
 * without this row a turn that knew about prior work and one that guessed look the same
 * from outside. That makes "was not told" indistinguishable from "was told and ignored
 * it" — which is the failure mode this feature actually has.
 */
import type { InstanceAiTimelineEntry } from '@n8n/api-types';
import { N8nAiActivityStep } from '@n8n/design-system';
import { computed } from 'vue';

import { useI18n } from '@n8n/i18n';

type ContextEntry = Extract<InstanceAiTimelineEntry, { type: 'instance-context' }>;

const props = defineProps<{ entry: ContextEntry }>();

const i18n = useI18n();

const injection = computed(() => props.entry.injection);

/** Only the legs that carried something, so an empty leg does not read as a zero result. */
const legSummary = computed<string>(() => {
	if (injection.value.state !== 'injected') return '';
	const { legs } = injection.value;
	const parts: string[] = [];

	if (legs.inventory > 0) {
		parts.push(
			i18n.baseText('aiAssistant.instanceContext.trace.workflows', {
				adjustToNumber: legs.inventory,
			}),
		);
	}
	if (legs.events > 0) {
		parts.push(
			i18n.baseText('aiAssistant.instanceContext.trace.changes', { adjustToNumber: legs.events }),
		);
	}
	if (legs.runs > 0) {
		parts.push(
			i18n.baseText('aiAssistant.instanceContext.trace.runs', { adjustToNumber: legs.runs }),
		);
	}

	return parts.join(', ');
});

/**
 * Named rather than counted. "Went 2 deep" tells a reader nothing without the rung
 * table in front of them, whereas "opened an entry" is the thing that happened.
 */
const reachSummary = computed<string>(() => {
	const surfaces = props.entry.reach?.surfaces ?? [];
	return surfaces
		.map((surface) => i18n.baseText(`aiAssistant.instanceContext.trace.surface.${surface}`))
		.join(', ');
});

const label = computed<string>(() => {
	if (injection.value.state === 'absent') {
		return i18n.baseText('aiAssistant.instanceContext.trace.none');
	}

	const head = injection.value.isUpdate
		? i18n.baseText('aiAssistant.instanceContext.trace.readUpdate')
		: i18n.baseText('aiAssistant.instanceContext.trace.read');

	// Em-dash separated so the label reads as one sentence at a glance, which is all it
	// gets before the reader decides whether to expand it.
	return [head, legSummary.value, reachSummary.value].filter(Boolean).join(' — ');
});

/**
 * Gated on the state, not just on presence. The block rides beside the injection rather
 * than inside it, so an absent entry carrying a block is representable — and rendering it
 * would put the block under a "nothing to read" label.
 */
const blockText = computed<string | undefined>(() =>
	injection.value.state === 'injected' ? props.entry.block : undefined,
);
</script>

<template>
	<N8nAiActivityStep
		:label="label"
		:has-content="true"
		wrap-content
		data-test-id="instance-ai-context-step"
	>
		<div v-if="blockText" :class="$style.block">
			<div :class="$style.heading">
				{{ i18n.baseText('aiAssistant.instanceContext.trace.blockHeading') }}
			</div>
			<pre :class="$style.pre">{{ blockText }}</pre>
		</div>
		<div v-else :class="$style.heading">
			{{ i18n.baseText('aiAssistant.instanceContext.trace.noneHint') }}
		</div>
	</N8nAiActivityStep>
</template>

<style lang="scss" module>
.block {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.heading {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.pre {
	margin: 0;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	color: var(--color--text--shade-1);
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
