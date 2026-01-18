const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.whatsAppTrigger',
			version: 1,
			config: { position: [48, 496], name: 'WhatsApp Message Received' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.whatsApp',
			version: 1,
			config: { position: [288, 496], name: 'Get Media URL' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: { position: [544, 496], name: 'Download Image File' },
		}),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.extractFromFile',
					version: 1,
					config: { position: [880, 400], name: 'Image to Base64' },
				}),
				node({
					type: '@n8n/n8n-nodes-langchain.googleGemini',
					version: 1,
					config: { position: [880, 592], name: 'AI Design Analysis' },
				}),
			],
			{ version: 3.2, name: 'Combine Image & Analysis' },
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [1408, 496], name: 'Prepare API Payload' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: { position: [1648, 496], name: 'Generate Enhanced Image' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.convertToFile',
			version: 1.1,
			config: { position: [1872, 496], name: 'Convert Base64 to Image' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.whatsApp',
			version: 1,
			config: { position: [2080, 496], name: 'Send Image' },
		}),
	)
	.add(sticky('', { position: [-608, -224] }));
