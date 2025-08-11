<script setup lang="ts">
import { usePersonalizedTemplatesV2Store } from '../stores/templateRecoV2.store';
import NodeRecommendationCard from './NodeRecommendationCard.vue';
import { useI18n } from '@n8n/i18n';

const templateRecoV2Store = usePersonalizedTemplatesV2Store();
const locale = useI18n();
</script>

<template>
	<div
		v-if="templateRecoV2Store.nodes.length"
		class="text-center mt-3xl"
		data-test-id="list-empty-state"
	>
		<N8nHeading tag="h2" size="medium" class="mb-2xs" color="text-light">
			{{ locale.baseText('workflows.templateRecoV2.exploreTemplates') }}
		</N8nHeading>
		<div :class="$style.nodeCardsContainer">
			<NodeRecommendationCard
				v-for="node in templateRecoV2Store.nodes"
				:key="node"
				:node-name="node"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.nodeCardsContainer {
	display: flex;
	justify-content: center;
	gap: var(--spacing-s);
	margin-top: var(--spacing-xl);
}
</style>
