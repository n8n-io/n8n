<template>
	<div class="container" ref="mainPanelContainer">
		<div class="main-panel">
			<trigger-helper-panel
				v-if="nodeCreatorStore.selectedType === TRIGGER_NODE_FILTER"
				@nodeTypeSelected="$listeners.nodeTypeSelected"
			>
				<template #header>
					<type-selector />
				</template>
			</trigger-helper-panel>
			<categorized-items
				v-else
				enable-global-categories-counter
				:categorizedItems="categorizedItems"
				:categoriesWithNodes="categoriesWithNodes"
				:searchItems="searchItems"
				:excludedSubcategories="[OTHER_TRIGGER_NODES_SUBCATEGORY]"
				:initialActiveCategories="[CORE_NODES_CATEGORY]"
				:allItems="categorizedItems"
				@nodeTypeSelected="$listeners.nodeTypeSelected"
				@actionsOpen="() => {}"
			>
				<template #header>
					<type-selector />
				</template>
			</categorized-items>
		</div>
	</div>
</template>

<script setup lang="ts">
import { watch, getCurrentInstance, onMounted, onUnmounted } from 'vue';
import { externalHooks } from '@/mixins/externalHooks';
import TriggerHelperPanel from './TriggerHelperPanel.vue';
import {
	ALL_NODE_FILTER,
	TRIGGER_NODE_FILTER,
	OTHER_TRIGGER_NODES_SUBCATEGORY,
	CORE_NODES_CATEGORY,
} from '@/constants';
import CategorizedItems from './CategorizedItems.vue';
import TypeSelector from './TypeSelector.vue';
import { INodeCreateElement } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { useNodeTypesStore } from '@/stores/nodeTypes';

export interface Props {
	searchItems?: INodeCreateElement[];
}

withDefaults(defineProps<Props>(), {
	searchItems: () => [],
});

const instance = getCurrentInstance();
const { $externalHooks } = new externalHooks();
const { workflowId } = useWorkflowsStore();
const nodeCreatorStore = useNodeCreatorStore();
const { categorizedItems, categoriesWithNodes } = useNodeTypesStore();

watch(
	() => nodeCreatorStore.selectedType,
	(newValue, oldValue) => {
		$externalHooks().run('nodeCreateList.selectedTypeChanged', {
			oldValue,
			newValue,
		});
		instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.selectedTypeChanged', {
			old_filter: oldValue,
			new_filter: newValue,
			workflow_id: workflowId,
		});
	},
);

onMounted(() => {
	$externalHooks().run('nodeCreateList.mounted');
	// Make sure tabs are visible on mount
	nodeCreatorStore.setShowTabs(true);
});

onUnmounted(() => {
	nodeCreatorStore.setSelectedType(ALL_NODE_FILTER);
	$externalHooks().run('nodeCreateList.destroyed');
	instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.destroyed', {
		workflow_id: workflowId,
	});
});
</script>

<style lang="scss" scoped>
.container {
	height: 100%;
}
.main-panel {
	height: 100%;
}
</style>
