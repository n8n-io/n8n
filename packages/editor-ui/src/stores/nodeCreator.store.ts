import { defineStore } from 'pinia';
import { STORES, TRIGGER_NODE_CREATOR_VIEW } from '@/constants';
import type {
	NodeFilterType,
	NodeCreatorOpenSource,
	SimplifiedNodeType,
	ActionsRecord,
} from '@/Interface';

import { ref } from 'vue';

export const useNodeCreatorStore = defineStore(STORES.NODE_CREATOR, () => {
	const selectedView = ref<NodeFilterType>(TRIGGER_NODE_CREATOR_VIEW);
	const mergedNodes = ref<SimplifiedNodeType[]>([]);
	const actions = ref<ActionsRecord<typeof mergedNodes.value>>({});

	const showScrim = ref(false);
	const openSource = ref<NodeCreatorOpenSource>('');

	function setMergeNodes(nodes: SimplifiedNodeType[]) {
		mergedNodes.value = nodes;
	}

	function setActions(nodes: ActionsRecord<typeof mergedNodes.value>) {
		actions.value = nodes;
	}

	function setShowScrim(isVisible: boolean) {
		showScrim.value = isVisible;
	}

	function setSelectedView(view: NodeFilterType) {
		selectedView.value = view;
	}

	function setOpenSource(view: NodeCreatorOpenSource) {
		openSource.value = view;
	}

	return {
		openSource,
		selectedView,
		showScrim,
		mergedNodes,
		actions,
		setShowScrim,
		setSelectedView,
		setOpenSource,
		setActions,
		setMergeNodes,
	};
});
