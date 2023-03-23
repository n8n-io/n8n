import { getCurrentInstance, computed } from 'vue';
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

export default (category) => {
	const instance = getCurrentInstance();
	const nodeCreatorStore = useNodeCreatorStore();

	const CALLOUTS = {
		[i18n.baseText('nodeCreator.actionsCategory.actions')]: 'Sup baby',
		[i18n.baseText('nodeCreator.actionsCategory.triggers')]: 'Trigger bab',
	};

	const categoryCallout = computed(() => CALLOUTS[category] || '');
	return {
		categoryCallout,
	};
};
