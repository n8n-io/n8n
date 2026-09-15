<script lang="ts" setup>
/**
 * The trace row for what a turn was handed before it started.
 *
 * Its reason for existing is that the block is stripped from the visible message, so
 * without this row a turn that knew about prior work and one that guessed look the same
 * from outside. That makes "was not told" indistinguishable from "was told and ignored
 * it" — which is the failure mode this feature actually has.
 *
 * A line, not an expandable one: the label already says which legs carried something and
 * how far the turn then read, and the block text itself is not shown anywhere.
 */
import { N8nAiActivityStep } from '@n8n/design-system';
import { computed } from 'vue';

import { useInstanceContextLabel, type InstanceContextEntry } from '../instanceContextLabels';

const props = defineProps<{ entry: InstanceContextEntry }>();

const { getInstanceContextLabel } = useInstanceContextLabel();

const label = computed<string>(() => getInstanceContextLabel(props.entry));
</script>

<template>
	<N8nAiActivityStep :label="label" :has-content="false" data-test-id="instance-ai-context-step" />
</template>
