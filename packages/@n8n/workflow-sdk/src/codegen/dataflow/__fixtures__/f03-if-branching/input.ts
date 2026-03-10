workflow({ name: 'IF Workflow' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		items.map((item) => {
			if (item.json.status === 'active') {
				const true_Branch = node({
					type: 'n8n-nodes-base.set',
					name: 'True Branch',
					params: {},
					version: 3,
				})();
			} else {
				const false_Branch = node({
					type: 'n8n-nodes-base.set',
					name: 'False Branch',
					params: {},
					version: 3,
				})();
			}
		});
	});
});
