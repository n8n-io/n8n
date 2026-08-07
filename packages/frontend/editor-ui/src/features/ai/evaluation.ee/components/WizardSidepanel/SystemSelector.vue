<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { useI18n } from '@n8n/i18n';
import { N8nOption, N8nSelect, N8nText } from '@n8n/design-system';

import { isSubNodeType } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useAiRootNodes } from '../../composables/useAiRootNodes';

const wizardStore = useEvaluationsWizardSidepanelStore();
const locale = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const nodeTypesStore = useNodeTypesStore();

const { aiNodeName, isSliceMode, startNodeName, endNodeName } = storeToRefs(wizardStore);

const aiRootNodes = useAiRootNodes();

// AI sub-nodes live off ai_* connections, never on the main chain we evaluate.
const nodeNameOptions = computed(() =>
	workflowDocumentStore.value.allNodes
		.filter((node) => !isSubNodeType(nodeTypesStore.getNodeType(node.type) ?? null))
		.map((node) => ({ name: node.name })),
);
</script>

<template>
	<div :class="$style.formBlock">
		<div
			v-if="!isSliceMode"
			:class="$style.sliceFields"
			data-test-id="evaluations-wizard-sidepanel-ai-node-picker"
		>
			<div :class="$style.field">
				<N8nText size="xsmall" color="text-base">
					{{ locale.baseText('evaluations.wizardSidepanel.step2.aiNode') }}
				</N8nText>
				<N8nSelect
					v-model="aiNodeName"
					size="small"
					filterable
					:placeholder="locale.baseText('evaluations.wizardSidepanel.step2.aiNode.placeholder')"
					data-test-id="evaluations-wizard-sidepanel-ai-node-select"
				>
					<N8nOption
						v-for="node in aiRootNodes"
						:key="node.name"
						:label="node.name"
						:value="node.name"
					/>
				</N8nSelect>
				<button
					type="button"
					:class="$style.sliceModeLink"
					data-test-id="evaluations-wizard-sidepanel-extend-to-slice"
					@click="wizardStore.enterSliceMode()"
				>
					{{ locale.baseText('evaluations.wizardSidepanel.step2.extendToSlice') }}
				</button>
			</div>
		</div>

		<div
			v-else
			:class="$style.sliceFields"
			data-test-id="evaluations-wizard-sidepanel-slice-picker"
		>
			<div :class="$style.field">
				<N8nText size="xsmall" color="text-base">
					{{ locale.baseText('evaluations.wizardSidepanel.step2.start') }}
				</N8nText>
				<N8nSelect
					v-model="startNodeName"
					size="small"
					filterable
					:placeholder="locale.baseText('evaluations.wizardSidepanel.step2.start.placeholder')"
					data-test-id="evaluations-wizard-sidepanel-start-select"
				>
					<N8nOption
						v-for="node in nodeNameOptions"
						:key="node.name"
						:label="node.name"
						:value="node.name"
					/>
				</N8nSelect>
			</div>
			<div :class="$style.field">
				<N8nText size="xsmall" color="text-base">
					{{ locale.baseText('evaluations.wizardSidepanel.step2.end') }}
				</N8nText>
				<N8nSelect
					v-model="endNodeName"
					size="small"
					filterable
					:placeholder="locale.baseText('evaluations.wizardSidepanel.step2.end.placeholder')"
					data-test-id="evaluations-wizard-sidepanel-end-select"
				>
					<N8nOption
						v-for="node in nodeNameOptions"
						:key="node.name"
						:label="node.name"
						:value="node.name"
					/>
				</N8nSelect>
				<button
					type="button"
					:class="$style.sliceModeLink"
					data-test-id="evaluations-wizard-sidepanel-reset-to-ai-node"
					@click="wizardStore.exitSliceMode()"
				>
					{{ locale.baseText('evaluations.wizardSidepanel.step2.resetToAiNode') }}
				</button>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.formBlock {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	overflow: hidden;
}

.sliceModeLink {
	align-self: flex-start;
	background: transparent;
	border: none;
	padding: 0;
	margin-top: var(--spacing--3xs);
	color: var(--color--primary, var(--background--brand));
	font-size: var(--font-size--2xs);
	cursor: pointer;
	text-decoration: none;

	&:hover,
	&:focus-visible {
		text-decoration: underline;
	}

	&:focus-visible {
		outline: 1px solid var(--focus--border-color);
		outline-offset: 2px;
	}
}

.sliceFields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	background-color: var(--background--subtle);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
