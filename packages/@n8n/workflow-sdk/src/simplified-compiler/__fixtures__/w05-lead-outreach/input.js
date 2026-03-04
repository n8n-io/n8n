onSchedule({ every: '1d' }, async () => {
	const leads = await http.get(
		'https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/values/Sheet1',
		{ auth: { type: 'oauth2', credential: 'Google Sheets' } },
	);

	const newLeads = leads.values.filter(function (row) {
		return row[2] === 'New';
	});

	for (const lead of newLeads) {
		await http.post(
			'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
			{
				to: lead[1],
				subject: 'Hello',
				body: 'Your outreach message here...',
			},
			{ auth: { type: 'oauth2', credential: 'Gmail' } },
		);

		await http.put(
			'https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/values/Sheet1',
			{ values: [['Contacted']] },
			{ auth: { type: 'oauth2', credential: 'Google Sheets' } },
		);
	}
});
