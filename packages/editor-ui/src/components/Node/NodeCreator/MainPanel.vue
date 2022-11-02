<template>
	<div
		class="container"
		ref="mainPanelContainer"
	>
		<div class="main-panel">
			<trigger-helper-panel
				v-if="selectedType === TRIGGER_NODE_FILTER"
				:searchItems="searchItems"
				@nodeTypeSelected="$listeners.nodeTypeSelected"
			>
				<type-selector slot="header" />
			</trigger-helper-panel>
			<categorized-items
				v-else
				:searchItems="searchItems"
				:excludedSubcategories="[OTHER_TRIGGER_NODES_SUBCATEGORY]"
				:initialActiveCategories="[CORE_NODES_CATEGORY]"
				@nodeTypeSelected="$listeners.nodeTypeSelected"
			>
				<type-selector slot="header" />
			</categorized-items>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, watch, getCurrentInstance, onMounted, onUnmounted } from 'vue';
import { externalHooks } from '@/components/mixins/externalHooks';
import TriggerHelperPanel from './TriggerHelperPanel.vue';
import { ALL_NODE_FILTER, TRIGGER_NODE_FILTER, OTHER_TRIGGER_NODES_SUBCATEGORY, CORE_NODES_CATEGORY } from '@/constants';
import CategorizedItems from './CategorizedItems.vue';
import TypeSelector from './TypeSelector.vue';
import { INodeCreateElement } from '@/Interface';
import { store } from '@/store';

export interface Props {
	searchItems?: INodeCreateElement[];
}

withDefaults(defineProps<Props>(), {
	searchItems: () => [],
});

const instance = getCurrentInstance();
const { $externalHooks } = new externalHooks();

const selectedType = computed<string> (() => store.getters['nodeCreator/selectedType']);

watch(selectedType, (newValue, oldValue) => {
	$externalHooks().run('nodeCreateList.selectedTypeChanged', {
		oldValue,
		newValue,
	});
	instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.selectedTypeChanged', {
		old_filter: oldValue,
		new_filter: newValue,
		workflow_id: store.getters.workflowId,
	});
});

onMounted(() => {
	$externalHooks().run('nodeCreateList.mounted');
	// Make sure tabs are visible on mount
	store.commit('nodeCreator/setShowTabs', true);
});

onUnmounted(() => {
	store.commit('nodeCreator/setSelectedType', ALL_NODE_FILTER);
	$externalHooks().run('nodeCreateList.destroyed');
	instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.destroyed', { workflow_id: store.getters.workflowId });
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
