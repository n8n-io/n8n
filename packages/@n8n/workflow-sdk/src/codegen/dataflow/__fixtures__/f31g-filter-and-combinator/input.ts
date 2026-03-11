workflow({ name: 'F31g: Filter — AND combinator (&&)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [
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
			const get_Users = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Get Users',
					params: { url: 'https://jsonplaceholder.typicode.com/users' },
					version: 4,
				}),
			);
			const filter = get_Users.filter(
				(item) => item.json.id > 3 && item.json.email.includes('.biz'),
			);
			const notify_User = filter.map((item) =>
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
