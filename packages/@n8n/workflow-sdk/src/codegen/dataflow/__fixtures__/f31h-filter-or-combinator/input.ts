workflow({ name: 'Filter OR Combinator' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			sampleData: [
				{
					id: 1,
					name: 'Leanne Graham',
					username: 'Bret',
					email: 'Sincere@april.biz',
					website: 'hildegard.org',
				},
			],
		},
		(items) => {
			const users = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Get Users',
					params: { url: 'https://jsonplaceholder.typicode.com/users' },
					version: 4,
				}),
			);
			const filtered = users.filter(
				(item) => item.json.username === 'Bret' || item.json.username === 'Antonette',
			);
			const notify = filtered.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Notify User',
					params: { url: 'https://jsonplaceholder.typicode.com/posts', method: 'POST' },
					version: 4,
				}),
			);
		},
	);
});
