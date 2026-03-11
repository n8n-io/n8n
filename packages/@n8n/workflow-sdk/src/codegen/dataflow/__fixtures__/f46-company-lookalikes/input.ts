import { $now } from 'n8n';

workflow({ name: 'F46: Company Lookalikes' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const read_Source_List = items.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.googleSheets',
				name: 'Read Source List',
				params: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/148uMDDvJLyCKwgClg8tdaMDwxYPXPxsv6EWCyH11R4s/edit#gid=0',
						cachedResultName: 'Source List',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '148uMDDvJLyCKwgClg8tdaMDwxYPXPxsv6EWCyH11R4s',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/148uMDDvJLyCKwgClg8tdaMDwxYPXPxsv6EWCyH11R4s/edit?usp=drivesdk',
						cachedResultName: 'Find Company Lookalikes',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: 'credential-id', name: 'Google Sheets account 2' },
				},
				version: 4.7,
			}),
		);
		const fetch_Similar_Companies = read_Source_List.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.httpRequest',
				name: 'Fetch Similar Companies',
				params: {
					url: 'https://api.companyenrich.com/companies/similar',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: { parameters: [{ name: 'domain', value: item.json.Domain }] },
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
				},
				version: 4.2,
			}),
		);
	});
	const merge_Source_API = executeNode(
		{
			type: 'n8n-nodes-base.merge',
			name: 'Merge Source & API',
			params: { mode: 'combine', options: {}, combineBy: 'combineByPosition' },
			version: 3,
		},
		[fetch_Similar_Companies, read_Source_List],
	);
	const split_Out_Items = merge_Source_API.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.splitOut',
			name: 'Split Out Items',
			params: { include: 'allOtherFields', options: {}, fieldToSplitOut: 'items' },
			version: 1,
		}),
	);
	const write_Results = split_Out_Items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.googleSheets',
			name: 'Write Results',
			params: {
				columns: {
					value: {
						'Added Date': $now,
						'Source Domain': item.json.Domain,
						'Similar Domain': item.json.items.domain,
						'Similarity Score': expr('{{ $json.metadata.scores[$json.items.id] }}'),
						'Similar Company Name': item.json.items.name,
					},
					schema: [
						{
							id: 'Source Domain',
							type: 'string',
							display: true,
							required: false,
							displayName: 'Source Domain',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'Similar Company Name',
							type: 'string',
							display: true,
							removed: false,
							required: false,
							displayName: 'Similar Company Name',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'Similar Domain',
							type: 'string',
							display: true,
							required: false,
							displayName: 'Similar Domain',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'Similarity Score',
							type: 'string',
							display: true,
							removed: false,
							required: false,
							displayName: 'Similarity Score',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'Added Date',
							type: 'string',
							display: true,
							required: false,
							displayName: 'Added Date',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
					],
					mappingMode: 'defineBelow',
					matchingColumns: [],
					attemptToConvertTypes: false,
					convertFieldsToString: false,
				},
				options: {},
				operation: 'append',
				sheetName: {
					__rl: true,
					mode: 'list',
					value: 1540563700,
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/148uMDDvJLyCKwgClg8tdaMDwxYPXPxsv6EWCyH11R4s/edit#gid=1540563700',
					cachedResultName: 'Lookalike Results',
				},
				documentId: {
					__rl: true,
					mode: 'list',
					value: '148uMDDvJLyCKwgClg8tdaMDwxYPXPxsv6EWCyH11R4s',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/148uMDDvJLyCKwgClg8tdaMDwxYPXPxsv6EWCyH11R4s/edit?usp=drivesdk',
					cachedResultName: 'Find Company Lookalikes',
				},
			},
			credentials: {
				googleSheetsOAuth2Api: { id: 'credential-id', name: 'Google Sheets account 2' },
			},
			version: 4.7,
		}),
	);
});
