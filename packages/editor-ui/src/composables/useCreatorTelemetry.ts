import type { IDataObject, NodeParameterValueType } from 'n8n-workflow';
import { ref } from 'vue';
import { useTelemetry } from './useTelemetry';
import type { INodeCreateElement } from '@/Interface';

interface State {
	pushRef: string;
	data: {
		nodeFilter: string;
		resultsNodes: string[];
		filterMode: 'Regular' | 'All';
	};
}

export function useCreatorTelemetry() {
	const userNodesPanelSession = ref<State>({
		pushRef: '',
		data: {
			nodeFilter: '',
			resultsNodes: [],
			filterMode: 'Regular',
		},
	});

	const telemetry = useTelemetry();

	function resetNodesPanelSession() {
		userNodesPanelSession.value.pushRef = `nodes_panel_session_${new Date().valueOf()}`;
		userNodesPanelSession.value.data = {
			nodeFilter: '',
			resultsNodes: [],
			filterMode: 'All',
		};
	}

	function generateNodesPanelEvent() {
		return {
			search_string: userNodesPanelSession.value.data.nodeFilter,
			results_count: userNodesPanelSession.value.data.resultsNodes.length,
			filter_mode: userNodesPanelSession.value.data.filterMode,
			nodes_panel_session_id: userNodesPanelSession.value.pushRef,
		};
	}

	function trackNodeCreatorEvent(event: string, properties: IDataObject = {}, withPostHog = false) {
		telemetry.track(
			event,
			{
				...properties,
				nodes_panel_session_id: userNodesPanelSession.value.pushRef,
			},
			{
				withPostHog,
			},
		);
	}

	// 			case 'nodeView.createNodeActiveChanged':
	function onNodeActiveChanged(properties: {
		source?: string;
		mode?: string;
		workflow_id?: string;
		createNodeActive?: boolean;
	}) {
		if (properties.createNodeActive) {
			resetNodesPanelSession();
			trackNodeCreatorEvent('User opened nodes panel', properties);
		}
	}

	// todo
	// 			case 'nodeCreateList.destroyed':
	function onCreatorDestroyed() {
		if (
			userNodesPanelSession.value.data.nodeFilter.length > 0 &&
			userNodesPanelSession.value.data.nodeFilter !== ''
		) {
			telemetry.track('User entered nodes panel search term', generateNodesPanelEvent());
		}
	}

	// todo
	// 			case 'nodeCreateList.nodeFilterChanged':
	function onNodeFilterChanged(properties: {
		newValue: string;
		oldValue: string;
		filteredNodes: INodeCreateElement[];
	}) {
		if (
			properties.newValue.length === 0 &&
			userNodesPanelSession.value.data.nodeFilter.length > 0
		) {
			telemetry.track('User entered nodes panel search term', generateNodesPanelEvent());
		}
		if (properties.newValue.length > (properties.oldValue || '').length) {
			userNodesPanelSession.value.data.nodeFilter = properties.newValue;
			userNodesPanelSession.value.data.resultsNodes = (properties.filteredNodes || []).map(
				(node: INodeCreateElement) => node.key,
			);
		}
	}

	// 			case 'nodeCreateList.onCategoryExpanded':
	function onCategoryExpanded(properties: { category_name: string; workflow_id: string }) {
		trackNodeCreatorEvent('User viewed node category', { ...properties, is_subcategory: false });
	}

	// 			case 'nodeCreateList.onViewActions':
	function onViewActions(properties: {
		app_identifier: string;
		actions: string[];
		regular_action_count: number;
		trigger_action_count: number;
	}) {
		trackNodeCreatorEvent('User viewed node actions', properties);
	}

	// 			case 'nodeCreateList.onActionsCustmAPIClicked':
	function onActionsCustomAPIClicked(properties: { app_identifier: string }) {
		trackNodeCreatorEvent('User clicked custom API from node actions', properties);
	}

	// 			case 'nodeCreateList.addAction':
	function onAddActions(properties: {
		node_type?: string;
		action: string;
		source_mode: string;
		resource: NodeParameterValueType;
	}) {
		trackNodeCreatorEvent('User added action', properties);
	}

	// 			case 'nodeCreateList.onSubcategorySelected':
	function onSubcategorySelected(properties: { subcategory: string }) {
		trackNodeCreatorEvent('User viewed node category', {
			category_name: properties.subcategory,
			is_subcategory: true,
		});
	}

	// 			case 'nodeView.addNodeButton':
	function onNodeAddedToCanvas(properties: {
		node_type: string;
		node_version: number;
		is_auto_add?: boolean;
		workflow_id: string;
		drag_and_drop?: boolean;
		input_node_type?: string;
	}) {
		trackNodeCreatorEvent('User added node to workflow canvas', properties, true);
	}

	return {
		onNodeActiveChanged,
		onCreatorDestroyed,
		onNodeFilterChanged,
		onCategoryExpanded,
		onActionsCustomAPIClicked,
		onViewActions,
		onAddActions,
		onSubcategorySelected,
		onNodeAddedToCanvas,
	};
}
