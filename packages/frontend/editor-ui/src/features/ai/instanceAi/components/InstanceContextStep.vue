<script lang="ts" setup>
/**
 * The trace row for what a turn was handed before it started.
 *
 * Its reason for existing is that the block is stripped from the visible message, so
 * without this row a turn that knew about prior work and one that guessed look the same
 * from outside. That makes "was not told" indistinguishable from "was told and ignored
 * it" — which is the failure mode this feature actually has.
 */
import { N8nAiActivityStep } from '@n8n/design-system';
import { computed } from 'vue';

import { useI18n } from '@n8n/i18n';

import { useInstanceContextLabel, type InstanceContextEntry } from '../instanceContextLabels';

const props = defineProps<{ entry: InstanceContextEntry }>();

const i18n = useI18n();
const { getInstanceContextLabel } = useInstanceContextLabel();

const injection = computed(() => props.entry.injection);

const label = computed<string>(() => getInstanceContextLabel(props.entry));

/**
 * Gated on the state, not just on presence. The block rides beside the injection rather
 * than inside it, so an absent entry carrying a block is representable — and rendering it
 * would put the block under a "nothing to read" label.
 */
const absentHintKey = computed<
	'aiAssistant.instanceContext.trace.failedHint' | 'aiAssistant.instanceContext.trace.noneHint'
>(() =>
	injection.value.state === 'absent' && injection.value.reason === 'failed'
		? 'aiAssistant.instanceContext.trace.failedHint'
		: 'aiAssistant.instanceContext.trace.noneHint',
);

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
		<div v-else-if="injection.state === 'absent'" :class="$style.heading">
			{{ i18n.baseText(absentHintKey) }}
		</div>
		<div v-else :class="$style.heading">
			{{ i18n.baseText('aiAssistant.instanceContext.trace.blockMissing') }}
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
