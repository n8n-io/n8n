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

export default (category, nodeName: string) => {
	const instance = getCurrentInstance();
	const nodeCreatorStore = useNodeCreatorStore();

	const CALLOUTS = {
		[i18n.baseText('nodeCreator.actionsCategory.actions')]: {
			empty: `No ${nodeName} Triggers available. Users often combine the following Triggers with ${nodeName} Actions. Learn more`,
		},
		[i18n.baseText('nodeCreator.actionsCategory.triggers')]: {
			info: 'Triggers start your workflow. Actions perform steps in your workflow. Learn more',
			empty: `We don’t have ${nodeName} actions yet. Have one in mind? Make a request in our community`,
		},
	};

	const categoryCallout = computed(() => CALLOUTS[category] || '');
	return {
		categoryCallout,
	};
};
