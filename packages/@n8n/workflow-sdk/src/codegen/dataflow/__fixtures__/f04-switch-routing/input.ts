workflow({ name: 'Switch Workflow' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		switch (items[0].json.destination) {
			case 'London': {
				const london_Handler = node({
					type: 'n8n-nodes-base.set',
					name: 'London Handler',
					params: {},
					version: 3,
				})(items);
				break;
			}
			case 'New York': {
				const new_York_Handler = node({
					type: 'n8n-nodes-base.set',
					name: 'New York Handler',
					params: {},
					version: 3,
				})(items);
				break;
			}
			default: {
				const default_Handler = node({
					type: 'n8n-nodes-base.set',
					name: 'Default Handler',
					params: {},
					version: 3,
				})(items);
				break;
			}
		}
	});
});
