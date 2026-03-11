workflow({ name: 'Else If Chain' }, () => {
	onTrigger(
		{ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, sampleData: [{ score: 95 }] },
		(items) => {
			if (items[0].json.score > 90) {
				const grade_A = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Grade A',
					params: {},
					version: 3.4,
				});
			} else if (items[0].json.score > 70) {
				const grade_B = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Grade B',
					params: {},
					version: 3.4,
				});
			} else {
				const grade_F = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Grade F',
					params: {},
					version: 3.4,
				});
			}
		},
	);
});
