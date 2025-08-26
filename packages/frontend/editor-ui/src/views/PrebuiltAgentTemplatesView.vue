<script setup lang="ts">
import { VIEWS } from '@/constants';
import { useI18n } from '@n8n/i18n';
import { useCalloutHelpers } from '@/composables/useCalloutHelpers';
import { computed, onMounted } from 'vue';
import type { OpenTemplateElement } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

const nodeTypesStore = useNodeTypesStore();

const i18n = useI18n();
const calloutHelpers = useCalloutHelpers();

const preBuiltAgents = computed<OpenTemplateElement[]>(() =>
	calloutHelpers.getPreBuiltAgentNodeCreatorItems(),
);

const tutorials = computed<OpenTemplateElement[]>(() =>
	calloutHelpers.getTutorialTemplatesNodeCreatorItems(),
);

const openTemplate = (templateId: string) => {
	calloutHelpers.openSampleWorkflowTemplate(templateId, {
		telemetry: {
			source: 'templates',
		},
	});
};

onMounted(async () => {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
});
</script>

<template>
	<PageViewLayout>
		<div :class="$style.content">
			<section :class="$style.section">
				<div :class="$style.header">
					<N8nHeading tag="h2" bold size="xlarge">
						{{ i18n.baseText('preBuiltAgentTemplates.title') }}
					</N8nHeading>
					<N8nLink :to="{ name: VIEWS.TEMPLATES }" underline bold>
						{{ i18n.baseText('preBuiltAgentTemplates.viewAllLink') }}
					</N8nLink>
				</div>

				<div :class="$style.grid">
					<N8nCard
						v-for="template in preBuiltAgents"
						:key="template.key"
						:class="$style.card"
						@click="openTemplate(template.properties.templateId)"
					>
						<N8nNodeCreatorNode
							:class="$style.templateLink"
							:title="template.properties.title"
							:description="template.properties.description"
							:tag="template.properties.tag"
							:show-action-arrow="true"
							:is-trigger="false"
							:hide-node-icon="true"
						>
							<template v-if="template.properties.nodes" #extraDetails>
								<NodeIcon
									v-for="node in template.properties.nodes"
									:key="node.name"
									:node-type="node"
									:size="16"
									:show-tooltip="true"
								/>
							</template>
						</N8nNodeCreatorNode>
					</N8nCard>
				</div>
			</section>

			<section :class="$style.section">
				<N8nHeading tag="h2" bold size="xlarge">
					{{ i18n.baseText('preBuiltAgentTemplates.tutorials') }}
				</N8nHeading>
				<div :class="$style.tutorials">
					<N8nCard
						v-for="template in tutorials"
						:key="template.key"
						:class="$style.card"
						@click="openTemplate(template.properties.templateId)"
					>
						<N8nNodeCreatorNode
							:class="$style.templateLink"
							:title="template.properties.title"
							:description="template.properties.description"
							:tag="template.properties.tag"
							:show-action-arrow="true"
							:is-trigger="false"
							:hide-node-icon="true"
						>
							<template v-if="template.properties.nodes" #extraDetails>
								<NodeIcon
									v-for="node in template.properties.nodes"
									:key="node.name"
									:node-type="node"
									:size="16"
									:show-tooltip="true"
								/>
							</template>
						</N8nNodeCreatorNode>
					</N8nCard>
				</div>
			</section>

			<N8nLink :to="{ name: VIEWS.TEMPLATES }" underline bold>
				{{ i18n.baseText('preBuiltAgentTemplates.viewAllLink') }}
			</N8nLink>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	gap: var(--spacing-m);
	padding-bottom: var(--spacing-l);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: var(--spacing-s);
	width: 100%;
	box-sizing: border-box;

	align-items: start;
	align-content: start;
	grid-auto-rows: auto;

	margin-bottom: var(--spacing-s);
}

.card {
	margin: 0;
	display: flex;
	flex-direction: column;
	align-self: start;
}

.tutorials {
	display: flex;
	flex-direction: column;
	width: 100%;
	gap: var(--spacing-s);
	margin-bottom: var(--spacing-s);
}

.templateLink {
	padding: 0;
}
</style>
