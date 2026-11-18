<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import ConstellationView from './ConstellationView.vue';

const document = injectWorkflowDocumentStore();
const route = useRoute();
const i18n = useI18n();
const workflow = computed(() => ({
	nodes: document.value.allNodes,
	connections: document.value.connectionsBySourceNode,
}));
const copy = computed(() => ({
	open: i18n.baseText('hackmation.constellation.open'),
	title: i18n.baseText('hackmation.constellation.title'),
	eyebrow: i18n.baseText('hackmation.constellation.eyebrow'),
	subtitle: i18n.baseText('hackmation.constellation.subtitle'),
	close: i18n.baseText('hackmation.constellation.close'),
	labels: i18n.baseText('hackmation.constellation.labels'),
	grid: i18n.baseText('hackmation.constellation.grid'),
	svg: i18n.baseText('hackmation.constellation.svg'),
	png: i18n.baseText('hackmation.constellation.png'),
	busy: i18n.baseText('hackmation.constellation.busy'),
	error: i18n.baseText('hackmation.constellation.error'),
	empty: i18n.baseText('hackmation.constellation.empty'),
	caption: i18n.baseText('hackmation.constellation.caption'),
	footer: i18n.baseText('hackmation.constellation.footer'),
}));
</script>

<template>
	<div :class="$style.entry">
		<ConstellationView
			:workflow="workflow"
			:copy="copy"
			:show-trigger="route.query.hackmation === 'constellation'"
		/>
	</div>
</template>

<style module>
.entry {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--4xl);
	z-index: 5;
}
</style>
