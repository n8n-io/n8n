const wf = workflow('uALIwhmZBIsiTqvl', 'Instagram Auto Liking - Creators Hub', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { position: [-688, -1984] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftSharePoint',
			version: 1,
			config: { position: [-496, -1984], name: 'Get Available Session Cookies' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: { position: [-272, -1984], name: 'Extract Cookies' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: { name: 'OpenAI Chat Model1' },
					}),
				},
				position: [-80, -1984],
				name: 'Select Cookie',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: { name: 'OpenAI Chat Model' },
					}),
				},
				position: [-768, -1568],
				name: 'Generate Random Hashtag',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [-432, -1568], name: 'Set ENV Variables' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.phantombuster',
			version: 1,
			config: { position: [-256, -1568], name: 'Get Hashtag Agent' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.phantombuster',
			version: 1,
			config: { position: [-80, -1568], name: 'Launch Agent' },
		}),
	)
	.then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { position: [80, -1568] } }))
	.then(
		node({
			type: 'n8n-nodes-base.phantombuster',
			version: 1,
			config: { position: [240, -1568], name: 'Get Posts' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [-1696, -1120], name: 'Wait2' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [-1520, -1120], name: 'Get Random Post' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftSharePoint',
			version: 1,
			config: { position: [-1328, -1120], name: 'Download file' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: { position: [-1136, -1120], name: 'Extract from File' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [-928, -1120], name: 'Check if in List' },
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: { position: [-1696, -1120], name: 'Wait2' },
				}),
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: { position: [-528, -1120], name: 'Prepare Updated Data' },
				}),
			],
			{ version: 2.2, name: 'If' },
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.convertToFile',
			version: 1.1,
			config: { position: [-336, -1120], name: 'Convert to File' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftSharePoint',
			version: 1,
			config: { position: [-128, -1120], name: 'Update file' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [80, -1120], name: 'Create CSV Binary' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftSharePoint',
			version: 1,
			config: { position: [272, -1120], name: 'Upload CSV' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.phantombuster',
			version: 1,
			config: { position: [512, -1120], name: 'Get Autoliking Agent' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.phantombuster',
			version: 1,
			config: { position: [736, -1120], name: 'Launch AL Agent' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [944, -1120], name: 'Wait1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.phantombuster',
			version: 1,
			config: { position: [1168, -1120], name: 'Get Response' },
		}),
	)
	.add(sticky('', { position: [-784, -1696] }))
	.add(sticky('', { name: 'Sticky Note1', position: [-1728, -1280] }))
	.add(sticky('', { name: 'Sticky Note2', position: [416, -1280] }))
	.add(sticky('', { name: 'Sticky Note4', position: [-784, -2112] }))
	.add(sticky('', { name: 'Sticky Note5', position: [416, -2112] }))
	.add(sticky('', { name: 'Sticky Note6', position: [416, -1696] }))
	.add(sticky('', { name: 'Sticky Note7', position: [-1728, -864] }))
	.add(sticky('', { name: 'Sticky Note8', position: [1424, -1280] }))
	.add(sticky('', { name: 'Sticky Note9', position: [-16, -864] }));
