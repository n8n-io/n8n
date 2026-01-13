<script setup lang="ts">
import { computed } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { useResourceCenterStore } from '../stores/resourceCenter.store';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nCard, N8nText } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		template: ITemplatesWorkflowFull;
		variant?: 'default' | 'noSetup';
		onClickOverride?: () => void;
	}>(),
	{
		variant: 'default',
		onClickOverride: undefined,
	},
);

const i18n = useI18n();

const nodeTypesStore = useNodeTypesStore();
const { getTemplateRoute, trackTemplateClick } = useResourceCenterStore();
const router = useRouter();

const templateNodes = computed(() => {
	if (!props.template?.nodes) return [];

	const uniqueNodeTypes = new Set(props.template.nodes.map((node) => node.name));
	const nodeTypesArray = Array.from(uniqueNodeTypes);

	const nodesToShow = [];

	// Show up to 2 node icons
	for (const nodeType of nodeTypesArray.slice(0, 2)) {
		const nodeTypeData = nodeTypesStore.getNodeType(nodeType);
		if (nodeTypeData) {
			nodesToShow.push(nodeTypeData);
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
			.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
			.replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
			.replace(/`(.*?)`/g, '$1') // Remove inline code `text`
			.replace(/!\[(.*?)\]\(.*?\)/g, '') // Remove images
			.replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links [text](url) -> text
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

const handleClick = async () => {
	if (props.onClickOverride) {
		props.onClickOverride();
	} else {
		trackTemplateClick(props.template.id);
		await router.push(getTemplateRoute(props.template.id));
	}
};
</script>

<template>
	<N8nCard :class="$style.card" @click="handleClick">
		<div :class="$style.content">
			<N8nText size="medium" :bold="true" :class="$style.title">
				{{ cleanTitle }}
			</N8nText>
			<N8nText v-if="cleanDescription" size="small" :class="[$style.description, 'mt-2xs']">
				{{ cleanDescription }}
			</N8nText>
		</div>
		<div :class="$style.footer">
			<div v-if="templateNodes.length > 0" :class="$style.nodes">
				<div v-for="nodeType in templateNodes" :key="nodeType!.name" :class="$style.nodeIcon">
					<NodeIcon :size="18" :stroke-width="1.5" :node-type="nodeType" />
				</div>
			</div>
			<span v-if="variant === 'noSetup'" :class="$style.label">
				{{ i18n.baseText('experiments.resourceCenter.badge.noSetup') }}
			</span>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	flex: 1 1 0;
	min-width: 200px;
	background-color: var(--color--background--light-2);
	cursor: pointer !important;
	transition: all 0.2s ease;

	&:hover {
		background-color: var(--color--foreground--tint-2);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
}

.content {
	flex: 1;
}

.title {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
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

.footer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--md);
}

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

.label {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color--success);
}
</style>
