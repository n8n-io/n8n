import { getCurrentInstance, computed, onMounted } from 'vue';
import {
	CORE_NODES_CATEGORY,
	WEBHOOK_NODE_TYPE,
	OTHER_TRIGGER_NODES_SUBCATEGORY,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	REGULAR_NODE_FILTER,
	TRANSFORM_DATA_SUBCATEGORY,
	FILES_SUBCATEGORY,
	FLOWS_CONTROL_SUBCATEGORY,
	HELPERS_SUBCATEGORY,
	TRIGGER_NODE_FILTER,
} from '@/constants';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { i18n } from '@/plugins/i18n';
import { sublimeSearch, matchesNodeType, matchesSelectType } from '@/utils';
import { INodeCreateElement } from '@/Interface';

export const useNodesSearch = () => {
	const instance = getCurrentInstance();
	const nodeCreatorStore = useNodeCreatorStore();

	function searchNodes(searchFilter: string, items: INodeCreateElement[]) {
		// In order to support the old search we need to remove the 'trigger' part
		const trimmedFilter = searchFilter.toLowerCase().replace('trigger', '');
		const result = (
			sublimeSearch<INodeCreateElement>(trimmedFilter, items, [
				{ key: 'properties.displayName', weight: 2 },
				{ key: 'properties.codex.alias', weight: 1 },
			]) || []
		).map(({ item }) => item);

		return result;
	}

	return {
		searchNodes,
	};
};
