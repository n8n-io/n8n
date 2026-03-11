workflow({ name: 'F44: SSL Expiry Alert' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.scheduleTrigger',
			name: 'Weekly Trigger',
			params: { rule: { interval: [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 8 }] } },
			version: 1.2,
		},
		(items) => {
			const fetch_URLs = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.googleSheets',
					name: 'Fetch URLs',
					params: {
						options: {},
						sheetName: {
							__rl: true,
							mode: 'url',
							value:
								'https://docs.google.com/spreadsheets/d/1pnUfIkD90MUG99Fp0vRoAB-w-GPSAwRZw0-JsNl-h3s/edit?gid=0#gid=0',
						},
						documentId: {
							__rl: true,
							mode: 'url',
							value:
								'https://docs.google.com/spreadsheets/d/1pnUfIkD90MUG99Fp0vRoAB-w-GPSAwRZw0-JsNl-h3s/edit?usp=sharing',
						},
					},
					credentials: {
						googleSheetsOAuth2Api: {
							id: 'credential-id',
							name: 'googleSheetsOAuth2Api Credential',
						},
					},
					version: 4.5,
				}),
			);
			const check_SSL = fetch_URLs.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Check SSL',
					params: {
						url: expr(
							'https://ssl-checker.io/api/v1/check/{{ $json["URL"].replace(/^https?:\\/\\//, "").replace(/\\/$/, "") }}',
						),
						options: {},
					},
					version: 4.2,
				}),
			);
			const uRLs_to_Monitor = check_SSL.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.googleSheets',
					name: 'URLs to Monitor',
					params: {
						columns: {
							value: { URL: item.json.result.host, KnownExpiryDate: item.json.result.valid_till },
							schema: [
								{
									id: 'Website ',
									type: 'string',
									display: true,
									removed: true,
									required: false,
									displayName: 'Website ',
									defaultMatch: false,
									canBeUsedToMatch: true,
								},
								{
									id: 'URL',
									type: 'string',
									display: true,
									removed: false,
									required: false,
									displayName: 'URL',
									defaultMatch: false,
									canBeUsedToMatch: true,
								},
								{
									id: 'KnownExpiryDate',
									type: 'string',
									display: true,
									required: false,
									displayName: 'KnownExpiryDate',
									defaultMatch: false,
									canBeUsedToMatch: true,
								},
								{
									id: 'row_number',
									type: 'string',
									display: true,
									removed: true,
									readOnly: true,
									required: false,
									displayName: 'row_number',
									defaultMatch: false,
									canBeUsedToMatch: true,
								},
							],
							mappingMode: 'defineBelow',
							matchingColumns: ['URL'],
						},
						options: {},
						operation: 'update',
						sheetName: {
							__rl: true,
							mode: 'list',
							value: 'gid=0',
							cachedResultUrl:
								'https://docs.google.YOUR_AWS_SECRET_KEY_HERE--d1X7509c6__b6gPvA5VpI/edit#gid=0',
							cachedResultName: 'URLs to Check',
						},
						documentId: {
							__rl: true,
							mode: 'url',
							value:
								'https://docs.google.YOUR_AWS_SECRET_KEY_HERE--d1X7509c6__b6gPvA5VpI/edit?gid=0#gid=0',
						},
					},
					credentials: {
						googleSheetsOAuth2Api: {
							id: 'credential-id',
							name: 'googleSheetsOAuth2Api Credential',
						},
					},
					version: 4.5,
				}),
			);
			uRLs_to_Monitor.map((item) => {
				if (item.json.result.days_left <= 7) {
					const send_Alert_Email = executeNode({
						type: 'n8n-nodes-base.gmail',
						name: 'Send Alert Email',
						params: {
							sendTo: 'user@example.com',
							message: `SSL Expiry - ${item.json.result.days_left} Days Left - ${item.json.result.host}`,
							options: { appendAttribution: false },
							subject: `SSL Expiry - ${item.json.result.days_left} Days Left - ${item.json.result.host}`,
							emailType: 'text',
						},
						credentials: { gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' } },
						version: 2.1,
					});
				}
			});
		},
	);
});
