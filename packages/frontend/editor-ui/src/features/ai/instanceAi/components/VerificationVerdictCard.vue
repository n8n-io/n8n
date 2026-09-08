<script lang="ts" setup>
import type { InstanceAiVerificationClaim } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nCard, N8nIcon, N8nText, type IconName, type TextColor } from '@n8n/design-system';
import { computed } from 'vue';

const props = defineProps<{
	claim: InstanceAiVerificationClaim;
}>();

const i18n = useI18n();

/** Cap the list so a wide workflow cannot flood the card. */
const MAX_LISTED_NODES = 8;

function formatNodes(names: string[]): string {
	if (names.length <= MAX_LISTED_NODES) return names.join(', ');
	return i18n.baseText('instanceAi.verificationVerdict.andMore', {
		interpolate: {
			nodes: names.slice(0, MAX_LISTED_NODES).join(', '),
			count: `${names.length - MAX_LISTED_NODES}`,
		},
	});
}

const heading = computed<{ text: string; icon: IconName; color: TextColor }>(() => {
	switch (props.claim.level) {
		case 'failed':
			return {
				text: i18n.baseText('instanceAi.verificationVerdict.title.failed'),
				icon: 'triangle-alert',
				color: 'danger',
			};
		case 'unproven':
			return {
				text: i18n.baseText('instanceAi.verificationVerdict.title.unproven'),
				icon: 'triangle-alert',
				color: 'warning',
			};
		// `verified` never reaches the card — the backend does not emit a verdict
		// for it, so there is nothing to disclose.
		default:
			return {
				text: i18n.baseText('instanceAi.verificationVerdict.title.partial'),
				icon: 'circle-alert',
				color: 'warning',
			};
	}
});

const facts = computed(() => {
	const { claim } = props;
	const lines: string[] = [];

	if (claim.unprovenTargets.length > 0) {
		lines.push(
			i18n.baseText('instanceAi.verificationVerdict.unprovenTargets', {
				interpolate: { nodes: formatNodes(claim.unprovenTargets) },
			}),
		);
	}
	if (claim.nodesNotReached.length > 0) {
		lines.push(
			i18n.baseText('instanceAi.verificationVerdict.notReached', {
				interpolate: {
					count: `${claim.nodesNotReached.length}`,
					total: `${claim.plannedNodeCount}`,
					nodes: formatNodes(claim.nodesNotReached),
				},
			}),
		);
	}
	if (claim.simulatedNodes.length > 0) {
		lines.push(
			i18n.baseText('instanceAi.verificationVerdict.simulated', {
				interpolate: { nodes: formatNodes(claim.simulatedNodes.map((node) => node.nodeName)) },
			}),
		);
	}
	if (claim.pinnedNodes.length > 0) {
		lines.push(
			i18n.baseText('instanceAi.verificationVerdict.pinned', {
				interpolate: { nodes: formatNodes(claim.pinnedNodes) },
			}),
		);
	}
	return lines;
});
</script>

<template>
	<N8nCard data-test-id="instance-ai-verification-verdict">
		<div :class="$style.heading">
			<N8nIcon :icon="heading.icon" size="small" :color="heading.color" />
			<N8nText bold size="small">{{ heading.text }}</N8nText>
		</div>
		<ul :class="$style.facts">
			<li v-for="fact in facts" :key="fact">
				<N8nText size="small" color="text-base">{{ fact }}</N8nText>
			</li>
		</ul>
	</N8nCard>
</template>

<style lang="scss" module>
.heading {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--2xs);
}

.facts {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding-left: var(--spacing--sm);

	li {
		list-style: disc;
	}
}
</style>
