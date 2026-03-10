workflow({ name: 'Multi Output' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const [compare_Datasets_0, compare_Datasets_1, compare_Datasets_2] = executeNode({
			type: 'n8n-nodes-base.compareDatasets',
			params: {},
			version: 1,
		});
		const only_In_A = compare_Datasets_0.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Only In A',
				params: {},
				version: 3,
			}),
		);
		const only_In_B = compare_Datasets_1.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Only In B',
				params: {},
				version: 3,
			}),
		);
		const in_Both = compare_Datasets_2.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.set',
				name: 'In Both',
				params: {},
				version: 3,
			}),
		);
	});
});
