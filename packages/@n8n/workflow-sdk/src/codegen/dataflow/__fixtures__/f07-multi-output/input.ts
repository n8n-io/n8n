workflow({ name: 'Multi Output' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const [compare_Datasets_0, compare_Datasets_1, compare_Datasets_2] = node({
			type: 'n8n-nodes-base.compareDatasets',
			params: {},
			version: 1,
		})(items);
		const only_In_A = node({
			type: 'n8n-nodes-base.set',
			name: 'Only In A',
			params: {},
			version: 3,
		})(compare_Datasets_0);
		const only_In_B = node({
			type: 'n8n-nodes-base.set',
			name: 'Only In B',
			params: {},
			version: 3,
		})(compare_Datasets_1);
		const in_Both = node({ type: 'n8n-nodes-base.set', name: 'In Both', params: {}, version: 3 })(
			compare_Datasets_2,
		);
	});
});
