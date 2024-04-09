export const nodesPanelSession = {
	pushRef: '',
	data: {
		nodeFilter: '',
		resultsNodes: [] as string[],
		filterMode: 'Regular',
	},
};

export const hooksGenerateNodesPanelEvent = () => {
	return {
		eventName: 'User entered nodes panel search term',
		properties: {
			search_string: nodesPanelSession.data.nodeFilter,
			results_count: nodesPanelSession.data.resultsNodes.length,
			results_nodes: nodesPanelSession.data.resultsNodes,
			filter_mode: nodesPanelSession.data.filterMode,
			nodes_panel_session_id: nodesPanelSession.pushRef,
		},
	};
};

export const hooksResetNodesPanelSession = () => {
	nodesPanelSession.pushRef = `nodes_panel_session_${new Date().valueOf()}`;
	nodesPanelSession.data = {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	};
};
