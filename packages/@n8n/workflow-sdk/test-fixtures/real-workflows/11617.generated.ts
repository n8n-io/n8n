const wf = workflow('CuCtsuECkQ1SRUFe', 'YouTube Shorts VEO Automation', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: { position: [272, 1904] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [496, 1904], name: 'If2' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [784, 1760], name: 'Send a text message8' },
		}),
	)
	.output(1)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 3,
			config: {
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.3,
						config: { name: 'OpenAI Chat Model' },
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: { name: 'Structured Output Parser' },
					}),
				},
				position: [720, 2048],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [1072, 2048], name: 'Send message and wait for response' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [1296, 2048], name: 'If1' },
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: { position: [1744, 1568], name: 'Generate a video1' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: { position: [1968, 1568], name: 'Upload video1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [2192, 1568], name: 'Label URL 1' },
		}),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: { position: [2192, 1568], name: 'Label URL 1' },
				}),
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: { position: [2192, 1952], name: 'Label URL 2' },
				}),
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: { position: [2192, 2336], name: 'Label URL 3' },
				}),
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: { position: [2192, 2720], name: 'Label URL 4' },
				}),
			],
			{ version: 3.2 },
		),
	)
	.then(
		node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { position: [2640, 2304] } }),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: { position: [2864, 2304], name: 'HTTP Request1' },
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.3,
					config: { position: [3312, 2176], name: 'HTTP Request2' },
				}),
				node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { position: [3312, 2400] } }),
			],
			{ version: 2.2, name: 'If' },
		),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: { position: [3536, 2176], name: 'Download a video' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: { position: [3760, 2176], name: 'Upload video2' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [3984, 2176], name: 'Label URL ' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [4208, 2176], name: 'Send a video' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [4432, 2176], name: 'Send message and wait for response1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [4656, 2176], name: 'If3' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: { position: [4880, 2176], name: 'Download a video1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.youTube',
			version: 1,
			config: { position: [5104, 2176], name: 'Upload a video' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [1968, 1376], name: 'Send a text message' },
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: { position: [1744, 1952], name: 'Generate a video2' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: { position: [1968, 1952], name: 'Upload video' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [1968, 1760], name: 'Send a text message2' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [1520, 2336], name: 'Wait5' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: { position: [1744, 2336], name: 'Generate a video3' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: { position: [1968, 2336], name: 'Upload video3' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [1968, 2144], name: 'Send a text message3' },
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: { position: [1744, 2720], name: 'Generate a video4' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: { position: [1968, 2720], name: 'Upload video4' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [1968, 2528], name: 'Send a text message4' },
		}),
	)
	.add(sticky('', { name: 'Sticky Note5', position: [2192, 1344] }))
	.add(sticky('', { position: [2560, 2112] }))
	.add(sticky('', { name: 'Sticky Note6', position: [112, 1648] }))
	.add(sticky('', { name: 'Sticky Note10', position: [1392, 1216] }))
	.add(sticky('', { name: 'Sticky Note11', position: [3488, 1968] }))
	.add(sticky('', { name: 'Sticky Note12', position: [-464, 1632] }));
