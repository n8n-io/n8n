<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

/** A one-line summary of a test turn: how many actions, and that none was sent. */
const props = defineProps<{
	count: number;
}>();

const i18n = useI18n();

const actionCount = computed(() =>
	Number.isFinite(props.count) ? Math.max(Math.floor(props.count), 0) : 0,
);
</script>

<template>
	<p v-if="actionCount > 0" :class="$style.summary" data-test-id="would-have-happened-summary">
		<N8nIcon icon="flask-conical" size="small" aria-hidden="true" />
		<span>{{
			i18n.baseText('agents.testRun.preview.summary', {
				adjustToNumber: actionCount,
				interpolate: { count: String(actionCount) },
			})
		}}</span>
	</p>
</template>

<style module lang="scss">
.summary {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
}
</style>
