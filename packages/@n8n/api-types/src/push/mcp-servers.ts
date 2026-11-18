export type McpServerUpdated = {
	type: 'mcpServerUpdated';
	data: {
		serverId: string;
		/** Who made the change. The page shows a notice for changes by the Assistant. */
		source: 'user' | 'assistant';
	};
};

export type McpServerCallRecorded = {
	type: 'mcpServerCallRecorded';
	data: { serverId: string };
};

export type McpServersPushMessage = McpServerUpdated | McpServerCallRecorded;
