workflow({ name: 'Selective Merge' }, () => {
	onTrigger(
		{ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, sampleData: [{ id: 1 }] },
		(items) => {},
	);
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
	const notify_Admin = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Notify Admin',
			params: { url: 'https://api.example.com/admin/notify', method: 'POST' },
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
	const process_Combined = merge_node.map((item) =>
		executeNode({ type: 'n8n-nodes-base.set', name: 'Process Combined', params: {}, version: 3 }),
	);
});
