<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { ruleTitle } from '../rule-text';
import { useWorkflowRulesStore } from '../workflow-rules.store';

const props = defineProps<{ nodeName: string }>();

const i18n = useI18n();
const store = useWorkflowRulesStore();

const findings = computed(() => store.findingsByNodeName.get(props.nodeName) ?? []);
const blocks = computed(() => findings.value.some((finding) => finding.severity === 'block'));
const customRules = computed(() => [
	...(store.effectiveRules?.instance.customRules ?? []),
	...(store.effectiveRules?.project?.customRules ?? []),
]);
</script>

<template>
	<div v-if="findings.length > 0">
		<N8nTooltip placement="top" :show-after="200">
			<template #content>
				<div :class="$style.tooltip">
					<strong>{{
						blocks
							? i18n.baseText('workflowRules.nodeBadge.blocking')
							: i18n.baseText('workflowRules.nodeBadge.warning')
					}}</strong>
					<ul>
						<li v-for="(finding, index) in findings" :key="`${finding.ruleId}-${index}`">
							{{ ruleTitle(i18n, finding.ruleId, customRules) }}
						</li>
					</ul>
					<span>{{ i18n.baseText('workflowRules.nodeBadge.hint') }}</span>
				</div>
			</template>
			<button
				type="button"
				:class="[$style.badge, blocks ? $style.block : $style.warn]"
				data-test-id="workflow-rule-node-badge"
				data-attr="workflow-rule-node-badge"
				:aria-label="i18n.baseText('workflowRules.nodeBadge.ariaLabel')"
				@click.stop="store.showPanel(nodeName)"
			>
				<N8nIcon icon="shield-half" size="small" />
				<span v-if="findings.length > 1">{{ findings.length }}</span>
			</button>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border: var(--border-width) solid currentColor;
	border-radius: var(--radius--full);
	background: var(--color--background--light-3);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
	cursor: pointer;
}

.block {
	color: var(--color--danger);
}

.warn {
	color: var(--color--warning);
}

.tooltip {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	// Narrow enough to stay next to the node on a zoomed-out canvas; no size token fits.
	max-width: 260px;

	ul {
		margin: 0;
		padding-left: var(--spacing--sm);
	}
}
</style>
