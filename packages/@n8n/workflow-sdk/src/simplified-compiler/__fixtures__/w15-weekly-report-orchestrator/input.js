onSchedule({ cron: '0 9 * * 1' }, async () => {
	const salesReport = await workflow.run('Generate Sales Report');
	const supportReport = await workflow.run('Generate Support Report');
	await http.post(
		'https://slack.com/api/chat.postMessage',
		{
			channel: '#reports',
			text: 'Weekly reports ready',
		},
		{ auth: { type: 'bearer', credential: 'Slack' } },
	);
});
