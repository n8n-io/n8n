export const nodesPanelSession = {
	sessionId: '',
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
			nodes_panel_session_id: nodesPanelSession.sessionId,
		},
	};
};

export const hooksResetNodesPanelSession = () => {
	nodesPanelSession.sessionId = `nodes_panel_session_${new Date().valueOf()}`;
	nodesPanelSession.data = {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	};
};
