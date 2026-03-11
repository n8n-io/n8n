workflow({ name: 'F32: Cascading merges (3 sources → merge A+B → merge with C)' }, () => {
	onTrigger(
		{ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, outputSampleData: [{ id: 1 }] },
		(items) => {},
	);
	const fetch_A = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch A',
			params: { url: 'https://api.example.com/source-a' },
			version: 4,
		}),
	);
	const fetch_B = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch B',
			params: { url: 'https://api.example.com/source-b' },
			version: 4,
		}),
	);
	const fetch_C = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch C',
			params: { url: 'https://api.example.com/source-c' },
			version: 4,
		}),
	);
	const merge_node = executeNode(
		{
			type: 'n8n-nodes-base.merge',
			params: { mode: 'combine', combineBy: 'combineByPosition' },
			version: 3,
		},
		[fetch_A, fetch_B],
	);
	const merge_1 = executeNode(
		{
			type: 'n8n-nodes-base.merge',
			name: 'Merge 1',
			params: { mode: 'combine', combineBy: 'combineByPosition' },
			version: 3,
		},
		[merge_node, fetch_C],
	);
	const final_Process = merge_1.map((item) =>
		executeNode({ type: 'n8n-nodes-base.set', name: 'Final Process', params: {}, version: 3.4 }),
	);
});
