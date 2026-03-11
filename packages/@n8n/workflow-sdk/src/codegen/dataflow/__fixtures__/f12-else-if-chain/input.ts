workflow({ name: 'F12: Else-if chain (chained IF nodes)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [{ score: 95 }],
		},
		(items) => {
			items.map((item) => {
				if (item.json.score > 90) {
					const grade_A = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'Grade A',
						params: {},
						version: 3.4,
					});
				} else {
					item.map((item) => {
						if (item.json.score > 70) {
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
					});
				}
			});
		},
	);
});
