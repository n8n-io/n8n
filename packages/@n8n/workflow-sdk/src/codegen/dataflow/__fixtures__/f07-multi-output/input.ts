workflow({ name: 'Multi Output' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {});
	const data_B = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Data B',
			params: {},
			version: 3,
			sampleData: [
				{ id: 2, name: 'Robert' },
				{ id: 3, name: 'Charlie' },
			],
		}),
	);
	const data_A = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Data A',
			params: {},
			version: 3,
			sampleData: [
				{ id: 1, name: 'Alice' },
				{ id: 2, name: 'Bob' },
			],
		}),
	);
	const [compare_Datasets_0, compare_Datasets_1, compare_Datasets_2] = executeNode(
		{
			type: 'n8n-nodes-base.compareDatasets',
			params: { mergeByFields: { values: [{ field1: 'id', field2: 'id' }] } },
			version: 1,
		},
		[data_A, data_B],
	);
	const only_In_A = compare_Datasets_0.map((item) =>
		executeNode({ type: 'n8n-nodes-base.set', name: 'Only In A', params: {}, version: 3 }),
	);
	const only_In_B = compare_Datasets_1.map((item) =>
		executeNode({ type: 'n8n-nodes-base.set', name: 'Only In B', params: {}, version: 3 }),
	);
	const in_Both = compare_Datasets_2.map((item) =>
		executeNode({ type: 'n8n-nodes-base.set', name: 'In Both', params: {}, version: 3 }),
	);
});
