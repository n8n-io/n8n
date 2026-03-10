workflow({ name: 'IF Workflow' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		if (items[0].json.status === 'active') {
			const true_Branch = node({
				type: 'n8n-nodes-base.set',
				name: 'True Branch',
				params: {},
				version: 3,
			})(items);
		} else {
			const false_Branch = node({
				type: 'n8n-nodes-base.set',
				name: 'False Branch',
				params: {},
				version: 3,
			})(items);
		}
	});
});
