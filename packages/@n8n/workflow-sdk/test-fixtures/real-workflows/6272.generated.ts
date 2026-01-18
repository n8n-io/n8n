const wf = workflow(
	'WEsO2dwjCaN6NwQT',
	'Compile top social-media trends to spreadsheet on SharePoint (or Drive/Dropbox)',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-768, 192], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [-560, 192], name: 'Set Config' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 3,
			config: { position: [-336, 48], name: 'Reddit API' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 2.1,
			config: { position: [-96, 192], name: 'Merge Data' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [80, 192], name: 'Aggregate Content' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: { position: [288, -16], name: 'AI Agent' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [608, 192], name: 'Prepare Excel' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.spreadsheetFile',
			version: 2,
			config: { position: [832, 192], name: 'Create Excel' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftSharePoint',
			version: 1,
			config: { position: [1040, 192], name: 'Microsoft SharePoint' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: { position: [-336, 320], name: 'Get Twitter Trends' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: { position: [288, 192], name: 'OpenAI Chat Model' },
		}),
	)
	.add(sticky('', { position: [-832, -208] }))
	.add(sticky('', { name: 'Sticky Note1', position: [112, -336] }))
	.add(sticky('', { name: 'Sticky Note2', position: [720, -112] }))
	.add(sticky('', { name: 'Sticky Note3', position: [720, 384] }));
