workflow({ name: 'F12: Else-if chain (chained IF nodes)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [{ score: 95 }],
		},
		(items) => {
			items.branch(
				(item) => item.json.score > 90,
				(items) => {
					const grade_A = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'Grade A',
						params: {
							assignments: {
								assignments: [{ id: 'a1', name: 'grade', type: 'string', value: 'A' }],
							},
						},
						version: 3.4,
					});
				},
				(items) => {
					items.branch(
						(item) => item.json.score > 70,
						(items) => {
							const grade_B = executeNode({
								type: 'n8n-nodes-base.set',
								name: 'Grade B',
								params: {
									assignments: {
										assignments: [{ id: 'b1', name: 'grade', type: 'string', value: 'B' }],
									},
								},
								version: 3.4,
							});
						},
						(items) => {
							const grade_F = executeNode({
								type: 'n8n-nodes-base.set',
								name: 'Grade F',
								params: {
									assignments: {
										assignments: [{ id: 'f1', name: 'grade', type: 'string', value: 'F' }],
									},
								},
								version: 3.4,
							});
						},
					);
				},
			);
		},
	);
});
