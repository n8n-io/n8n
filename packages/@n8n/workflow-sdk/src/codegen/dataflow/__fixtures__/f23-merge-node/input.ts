workflow({ name: 'Merge Workflow' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {});
	const fetch_Users = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch Users',
			params: { url: 'https://api.example.com/users' },
			version: 4,
		}),
	);
	const fetch_Orders = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch Orders',
			params: { url: 'https://api.example.com/orders' },
			version: 4,
		}),
	);
	const merge_node = executeNode(
		{
			type: 'n8n-nodes-base.merge',
			params: { mode: 'combine', combineBy: 'combineByPosition' },
			version: 3,
		},
		[fetch_Users, fetch_Orders],
	);
	const process_Result = merge_node.map((item) =>
		executeNode({ type: 'n8n-nodes-base.set', name: 'Process Result', params: {}, version: 3 }),
	);
});
