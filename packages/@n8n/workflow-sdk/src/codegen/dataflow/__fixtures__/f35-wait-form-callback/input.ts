workflow({ name: 'F35: Wait form with resumeUrl callback' }, () => {
	onTrigger(
		{ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, outputSampleData: [{ id: 1 }] },
		(items) => {
			waitOnForm(
				{ formTitle: 'Approval Required', formDescription: 'Please approve this request' },
				(resumeUrl) => {
					const notify_Approver = executeNode({
						type: 'n8n-nodes-base.httpRequest',
						name: 'Notify Approver',
						params: {
							url: 'https://api.example.com/notify',
							method: 'POST',
							body: { formLink: resumeUrl },
						},
						version: 4,
					});
				},
			);
			const handle_Response = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Handle Response',
				params: {},
				version: 3.4,
			});
		},
	);
});
