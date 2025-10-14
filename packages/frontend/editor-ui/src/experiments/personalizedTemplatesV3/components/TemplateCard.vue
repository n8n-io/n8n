<script setup lang="ts">
import { computed } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { type ITemplatesWorkflowResponse } from '@n8n/rest-api-client';
import { usePersonalizedTemplatesV3Store } from '../stores/personalizedTemplatesV3.store';
import { useRouter } from 'vue-router';
import { useUIStore } from '@/stores/ui.store';
import { EXPERIMENT_TEMPLATE_RECO_V3_KEY } from '@/constants';
import NodeIcon from '@/components/NodeIcon.vue';
import { N8nCard, N8nText } from '@n8n/design-system';

const props = defineProps<{
	template: ITemplatesWorkflowResponse;
}>();

const nodeTypesStore = useNodeTypesStore();
const { getTemplateRoute, trackTemplateClickFromModal } = usePersonalizedTemplatesV3Store();
const router = useRouter();
const uiStore = useUIStore();

const templateNodes = computed(() => {
	if (!props.template?.nodes) return [];

	const uniqueNodeTypes = new Set(props.template.nodes.map((node) => node.name));
	const nodeTypesArray = Array.from(uniqueNodeTypes);

	const nodesToShow = [];

	const hubspotNode = nodeTypesStore.getNodeType('n8n-nodes-base.hubspot');
	if (hubspotNode && uniqueNodeTypes.has('n8n-nodes-base.hubspot')) {
		nodesToShow.push(hubspotNode);
	}

	const otherNodes = nodeTypesArray.filter((nodeType) => nodeType !== 'n8n-nodes-base.hubspot');
	if (otherNodes.length > 0) {
		const otherNodeType = nodeTypesStore.getNodeType(otherNodes[0]);
		if (otherNodeType) {
			nodesToShow.push(otherNodeType);
		}
	}

	return nodesToShow;
});

const cleanTitle = computed(() => {
	if (!props.template?.name) return '';

	return props.template.name
		.replace(
			/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
			'',
		) // Remove emojis
		.replace(/\s+/g, ' ') // Replace multiple whitespace with single space
		.trim();
});

const cleanDescription = computed(() => {
	if (!props.template?.description) return '';

	return (
		props.template.description
			.replace(/\*\*(.*?)\*\*/g, '<script setup lang="ts">') // Remove bold **text**
			.replace(/\*(.*?)\*/g, '<script setup lang="ts">') // Remove italic *text*
			.replace(/`(.*?)`/g, '<script setup lang="ts">') // Remove inline code `text`
			.replace(/!\[(.*?)\]\(.*?\)/g, '') // Remove images
			.replace(/\[(.*?)\]\(.*?\)/g, '<script setup lang="ts">') // Remove links [text](url) -> text
			.replace(/#{1,6}\s/g, '') // Remove headers # ## ### etc
			.replace(/^\s*[-*+]\s/gm, '') // Remove list bullets
			.replace(/^\s*\d+\.\s/gm, '') // Remove numbered list
			.replace(
				/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
				'',
			) // Remove emojis
			.replace(/[\r\n\t\f\v]/g, ' ') // Replace line breaks and tabs with spaces
			.replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ') // Replace unicode whitespace
			// Actual variation selector character class
			// eslint-disable-next-line no-misleading-character-class
			.replace(/[\u200B-\u200D\uFEFF\uFE0F]/g, '') // Remove zero-width characters and variation selectors
			.replace(/\s+/g, ' ') // Replace multiple whitespace with single space
			.trim()
	);
});

const handleUseTemplate = async () => {
	trackTemplateClickFromModal(props.template.id);
	await router.push(getTemplateRoute(props.template.id));
	uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V3_KEY);
};
</script>

<template>
	<N8nCard :class="$style.suggestion" @click="handleUseTemplate">
		<div :class="$style.content">
			<N8nText size="medium" :bold="true">
				{{ cleanTitle }}
			</N8nText>
			<N8nText v-if="cleanDescription" size="small" :class="[$style.description, 'mt-2xs']">
				{{ cleanDescription }}
			</N8nText>
		</div>
		<div v-if="templateNodes.length > 0" :class="[$style.nodes, 'mt-m']">
			<div v-for="nodeType in templateNodes" :key="nodeType!.name" :class="$style.nodeIcon">
				<NodeIcon :size="18" :stroke-width="1.5" :node-type="nodeType" />
			</div>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.nodes {
	display: flex;
	flex-direction: row;
}

.nodeIcon {
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	margin-right: var(--spacing--3xs);
}

.remainingNodes {
	color: var(--color--text);
	border-color: var(--color--background--light-2);
}

.description {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
	color: var(--color--text--tint-1);
}

.suggestion {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-width: 200px;
	background-color: var(--color--background--light-2);
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		background-color: var(--color--background);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
}

.content {
	flex: 1;
}
</style>
