<script setup lang="ts">
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { ruleTitle } from '../rule-text';
import { useWorkflowRulesStore } from '../workflow-rules.store';

const emit = defineEmits<{ 'show-panel': [] }>();

const i18n = useI18n();
const store = useWorkflowRulesStore();

const count = computed(() => store.blockingFindings.length);
const customRules = computed(() => [
	...(store.effectiveRules?.instance.customRules ?? []),
	...(store.effectiveRules?.project?.customRules ?? []),
]);
</script>

<template>
	<N8nCallout
		v-if="store.isEnabled && count > 0"
		theme="danger"
		icon="ban"
		data-test-id="workflow-rules-publish-callout"
	>
		<div :class="$style.body">
			<strong>{{
				i18n.baseText('workflowRules.publish.blocked', {
					interpolate: { count },
					adjustToNumber: count,
				})
			}}</strong>
			<ul :class="$style.list">
				<li v-for="(finding, index) in store.blockingFindings.slice(0, 5)" :key="index">
					{{ ruleTitle(i18n, finding.ruleId, customRules)
					}}<template v-if="finding.nodeName"> · {{ finding.nodeName }}</template>
				</li>
			</ul>
		</div>
		<template #trailingContent>
			<N8nButton
				variant="outline"
				size="small"
				:label="i18n.baseText('workflowRules.publish.showRules')"
				data-test-id="workflow-rules-publish-show"
				@click="emit('show-panel')"
			/>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.list {
	margin: 0;
	padding-left: var(--spacing--sm);
}
</style>
