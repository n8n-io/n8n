<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { type ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { useRecommendedTemplatesStore } from '../recommendedTemplates.store';
import { useRouter } from 'vue-router';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useI18n } from '@n8n/i18n';
import { N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import {
	keyFromCredentialTypeAndName,
	normalizeTemplateNodeCredentials,
} from '@/features/workflows/templates/utils/templateTransforms';
import { getNodeTypeDisplayableCredentials } from '@/app/utils/nodes/nodeTransforms';

const props = defineProps<{
	template: ITemplatesWorkflowFull;
	tileNumber?: number;
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const { getTemplateRoute, trackTemplateTileClick, trackTemplateShown } =
	useRecommendedTemplatesStore();
const router = useRouter();

const templateNodes = computed(() => {
	if (!props.template?.nodes) return [];

	const uniqueNodeTypes = new Set(props.template.nodes.map((node) => node.name));
	const nodeTypesArray = Array.from(uniqueNodeTypes).slice(0, 2);

	return nodeTypesArray.map((nodeType) => nodeTypesStore.getNodeType(nodeType)).filter(Boolean);
});

const credentialsCount = computed(() => {
	const workflowNodes = props.template?.workflow?.nodes ?? [];
	if (workflowNodes.length === 0) return 0;

	const uniqueCredentialKeys = new Set<string>();

	for (const node of workflowNodes) {
		const requiredCredentials = getNodeTypeDisplayableCredentials(nodeTypesStore, node);
		if (requiredCredentials.length === 0) continue;

		const normalizedNodeCredentials = node.credentials
			? normalizeTemplateNodeCredentials(node.credentials)
			: {};

		for (const credentialDescription of requiredCredentials) {
			const credentialType = credentialDescription.name;
			const credentialName = normalizedNodeCredentials[credentialType] ?? '';
			const key = keyFromCredentialTypeAndName(credentialType, credentialName);
			uniqueCredentialKeys.add(key);
		}
	}

	return uniqueCredentialKeys.size;
});

const setupTimeMinutes = computed(() => {
	const BASE_TIME = 2; // minutes for importing/understanding
	const CREDENTIAL_TIME = 3; // minutes per credential

	return BASE_TIME + credentialsCount.value * CREDENTIAL_TIME;
});

const hasTrackedShown = ref(false);
const cardRef = ref<InstanceType<typeof N8nCard> | null>(null);
let observer: IntersectionObserver | null = null;

const trackWhenVisible = () => {
	if (hasTrackedShown.value || props.tileNumber === undefined) {
		return;
	}

	hasTrackedShown.value = true;
	trackTemplateShown(props.template.id, props.tileNumber);
	if (observer && cardRef.value) {
		observer.unobserve(cardRef.value.$el);
	}
	observer = null;
};

const handleUseTemplate = async () => {
	trackTemplateTileClick(props.template.id);
	await router.push(getTemplateRoute(props.template.id));
};

onMounted(() => {
	if (!cardRef.value) return;

	if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
		trackWhenVisible();
		return;
	}

	observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				trackWhenVisible();
				break;
			}
		}
	});

	observer.observe(cardRef.value.$el);
});

onBeforeUnmount(() => {
	if (observer) {
		observer.disconnect();
		observer = null;
	}
});
</script>

<template>
	<N8nCard ref="cardRef" :class="$style.suggestion" @click="handleUseTemplate">
		<div :class="$style.cardContent">
			<div v-if="templateNodes.length > 0" :class="$style.nodes">
				<div v-for="nodeType in templateNodes" :key="nodeType!.name" :class="$style.nodeIcon">
					<NodeIcon :size="20" :stroke-width="1.5" :node-type="nodeType" />
				</div>
			</div>
			<N8nText size="large" :bold="true">
				{{ template.name }}
			</N8nText>
			<div :class="$style.stats">
				<div :class="$style.statItem">
					<N8nIcon icon="clock" size="medium" color="text-base" />
					<N8nText size="small" color="text-dark">
						{{
							i18n.baseText('templates.card.setupTime', {
								interpolate: { count: setupTimeMinutes },
							})
						}}
					</N8nText>
				</div>
			</div>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.suggestion {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg);
	justify-content: space-between;
	min-width: 200px;
	background-color: var(--color--background--light-3);
	cursor: pointer;
}

.cardContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	flex: 1;
}

.nodes {
	display: flex;
	flex-direction: row;
}

.nodeIcon {
	padding: 0 var(--spacing--2xs);
	background-color: var(--dialog--color--background);
	border-radius: var(--radius--lg);
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: end;
	margin-right: var(--spacing--3xs);
}

.stats {
	margin-top: auto;
}

.statItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
