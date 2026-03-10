workflow({ name: 'Switch Workflow' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		switch (items[0].json.destination) {
			case 'London': {
				const london_Handler = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'London Handler',
					params: {},
					version: 3,
				});
				break;
			}
			case 'New York': {
				const new_York_Handler = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'New York Handler',
					params: {},
					version: 3,
				});
				break;
			}
			default: {
				const default_Handler = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Default Handler',
					params: {},
					version: 3,
				});
				break;
			}
		}
	});
});
