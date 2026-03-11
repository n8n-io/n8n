workflow({ name: 'Email New Leads' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.scheduleTrigger',
			params: { rule: { interval: [{ triggerAtHour: 9 }] } },
			version: 1.2,
		},
		(items) => {
			const get_row_s_in_sheet3 = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.googleSheets',
					name: 'Get row(s) in sheet3',
					params: {
						options: {},
						sheetName: {
							__rl: true,
							mode: 'list',
							value: 'gid=0',
							cachedResultUrl:
								'https://docs.google.com/spreadsheets/d/1sXXVbl2kKdYTzCmZDe7QyeMp1N9wZg9K63oGK2UIaeU/edit#gid=0',
							cachedResultName: 'Sheet1',
						},
						documentId: {
							__rl: true,
							mode: 'list',
							value: '1sXXVbl2kKdYTzCmZDe7QyeMp1N9wZg9K63oGK2UIaeU',
							cachedResultUrl:
								'https://docs.google.com/spreadsheets/d/1sXXVbl2kKdYTzCmZDe7QyeMp1N9wZg9K63oGK2UIaeU/edit?usp=drivesdk',
							cachedResultName: 'New Leads',
						},
					},
					credentials: {
						googleSheetsOAuth2Api: {
							id: 'credential-id',
							name: 'googleSheetsOAuth2Api Credential',
						},
					},
					version: 4.7,
				}),
			);
			const filter1 = get_row_s_in_sheet3.filter(
				(item) => /* unknown operator: empty */ item.json.Contacted,
			);
			const append_or_update_row_in_sheet1 = filter1.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.googleSheets',
					name: 'Append or update row in sheet1',
					params: {
						columns: {
							value: { Email: item.json.Email, Contacted: 'Yes' },
							schema: [
								{
									id: 'Email',
									type: 'string',
									display: true,
									removed: false,
									required: false,
									displayName: 'Email',
									defaultMatch: false,
									canBeUsedToMatch: true,
								},
								{
									id: 'Contacted',
									type: 'string',
									display: true,
									required: false,
									displayName: 'Contacted',
									defaultMatch: false,
									canBeUsedToMatch: true,
								},
								{
									id: 'Created',
									type: 'string',
									display: true,
									removed: true,
									required: false,
									displayName: 'Created',
									defaultMatch: false,
									canBeUsedToMatch: true,
								},
							],
							mappingMode: 'defineBelow',
							matchingColumns: ['Email'],
							attemptToConvertTypes: false,
							convertFieldsToString: false,
						},
						options: {},
						operation: 'appendOrUpdate',
						sheetName: {
							__rl: true,
							mode: 'list',
							value: 'gid=0',
							cachedResultUrl:
								'https://docs.google.com/spreadsheets/d/14T6rilaOl1LBTwNnu7ILE3T1equWOz0noI-OIUaI3zU/edit#gid=0',
							cachedResultName: 'leads',
						},
						documentId: {
							__rl: true,
							mode: 'list',
							value: '14T6rilaOl1LBTwNnu7ILE3T1equWOz0noI-OIUaI3zU',
							cachedResultUrl:
								'https://docs.google.com/spreadsheets/d/14T6rilaOl1LBTwNnu7ILE3T1equWOz0noI-OIUaI3zU/edit?usp=drivesdk',
							cachedResultName: 'New Leads - Real',
						},
					},
					credentials: {
						googleSheetsOAuth2Api: {
							id: 'credential-id',
							name: 'googleSheetsOAuth2Api Credential',
						},
					},
					version: 4.7,
				}),
			);
			const send_a_message = append_or_update_row_in_sheet1.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.microsoftOutlook',
					name: 'Send a message',
					params: {
						subject: 'Build AI Agents & Automations with n8n',
						bodyContent:
							'Hi There,\n\nI help people learn how to build AI agents and create powerful AI automations using n8n. If you\u2019re exploring ways to save time or scale your workflows, I\u2019d love to share what\u2019s possible.\n\nYou can check out my n8n Creator profile here with 70+ ready-to-use automations:\n👉 https://n8n.io/creators/rbreen\n\nIf you\u2019d like help getting started or want to see what AI + n8n can do for your business, just reply to this email.\n\nBest,\nRobert Breen\n📞 +1234567890\n🔗 https://www.linkedin.com/in/robert-breen-29429625/',
						toRecipients: item.json.Email,
						additionalFields: {},
					},
					credentials: {
						microsoftOutlookOAuth2Api: {
							id: 'credential-id',
							name: 'microsoftOutlookOAuth2Api Credential',
						},
					},
					version: 2,
				}),
			);
		},
	);
});
