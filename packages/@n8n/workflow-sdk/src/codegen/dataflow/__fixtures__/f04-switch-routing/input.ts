workflow({ name: 'Switch Workflow' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		items.map((item) => {
			switch (item.json.destination) {
				case 'London': {
					const london_Handler = node({
						type: 'n8n-nodes-base.set',
						name: 'London Handler',
						params: {},
						version: 3,
					})();
					break;
				}
				case 'New York': {
					const new_York_Handler = node({
						type: 'n8n-nodes-base.set',
						name: 'New York Handler',
						params: {},
						version: 3,
					})();
					break;
				}
				default: {
					const default_Handler = node({
						type: 'n8n-nodes-base.set',
						name: 'Default Handler',
						params: {},
						version: 3,
					})();
					break;
				}
			}
		});
	});
});
