workflow({ name: 'F07: Multi-input/output (Compare Datasets with 2 inputs → 3 branches)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {});
	const data_B = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Data B',
			params: {},
			version: 3.4,
			output: [
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
			version: 3.4,
			output: [
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
		executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Only In A',
			params: {
				assignments: {
					assignments: [{ id: 'a1', name: 'source', type: 'string', value: 'only-in-a' }],
				},
			},
			version: 3.4,
		}),
	);
	const only_In_B = compare_Datasets_1.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Only In B',
			params: {
				assignments: {
					assignments: [{ id: 'b1', name: 'source', type: 'string', value: 'only-in-b' }],
				},
			},
			version: 3.4,
		}),
	);
	const in_Both = compare_Datasets_2.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.set',
			name: 'In Both',
			params: {
				assignments: {
					assignments: [{ id: 'c1', name: 'source', type: 'string', value: 'in-both' }],
				},
			},
			version: 3.4,
		}),
	);
});
