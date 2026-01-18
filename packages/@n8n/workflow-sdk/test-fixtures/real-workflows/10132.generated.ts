const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { position: [-592, 80], name: 'Schedule Trigger1' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [-384, 192], name: 'Search for Main Folder' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [-176, 192], name: 'Get items in a folder1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [0, 192], name: 'If PDF 1' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [304, 896], name: 'Merge' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [480, 992], name: 'If Size' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { position: [480, 1168], name: 'Loop Over Items 2' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.compareDatasets',
			version: 2.3,
			config: { position: [768, 848], name: 'Compare Datasets' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { position: [1008, 928], name: 'Loop Over Items 3' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { position: [1264, 912], name: '2nd Loop Over Items1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [1280, 1136], name: 'Download file' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: { position: [1280, 1360], name: 'Extract PDF Text' },
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
						version: 1,
						config: { name: 'Mistral Cloud Chat Model' },
					}),
				},
				position: [1584, 1392],
				name: 'Document Information',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
						version: 1,
						config: { name: 'Mistral Cloud Chat Model' },
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							subnodes: {
								model: languageModel({
									type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
									version: 1,
									config: { name: 'Mistral Cloud Chat Model' },
								}),
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [1904, 1392],
				name: 'Document LLM Chain',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.1,
			config: { position: [2400, 1104], name: 'Merge1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: { position: [2400, 1296], name: 'Aggregate' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.dataTable',
			version: 1,
			config: { position: [2304, 1488], name: 'Insert row' },
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
						version: 1,
						config: { name: 'Mistral Cloud Chat Model' },
					}),
				},
				position: [1584, 1104],
				name: 'Overview',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
						version: 1,
						config: { name: 'Mistral Cloud Chat Model' },
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							subnodes: {
								model: languageModel({
									type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
									version: 1,
									config: { name: 'Mistral Cloud Chat Model' },
								}),
							},
							name: 'Structured Output Parser1',
						},
					}),
				},
				position: [1904, 1104],
				name: 'Overview LLM Chain',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [1024, 1136], name: 'Set File ID 3' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [496, 1376], name: 'Set File ID 2' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [-176, 400], name: 'Get items in a folder2' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [0, 400], name: 'If PDF 2' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [-176, 608], name: 'Get items in a folder3' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [0, 608], name: 'If PDF 3' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [-176, 816], name: 'Get items in a folder4' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [0, 816], name: 'If PDF 4' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [-176, 1024], name: 'Get items in a folder5' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [0, 1024], name: 'If PDF 5' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [-176, 1232], name: 'Get items in a folder6' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [0, 1232], name: 'If PDF 6' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [-176, 1440], name: 'Get items in a folder7' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [0, 1440], name: 'If PDF 7' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftOneDrive',
			version: 1,
			config: { position: [-176, 1648], name: 'Get items in a folder9' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [0, 1648], name: 'If PDF 8' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.dataTable',
			version: 1,
			config: { position: [192, 80], name: 'Get row(s)' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { position: [480, 544], name: 'Loop Over Items' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [496, 752], name: 'Set File ID 1' },
		}),
	)
	.add(sticky('', { position: [-240, 144] }))
	.add(sticky('', { name: 'Sticky Note1', position: [-784, 240] }))
	.add(sticky('', { name: 'Sticky Note4', position: [2464, 1504] }))
	.add(sticky('', { name: 'Sticky Note3', position: [1488, 1040] }))
	.add(sticky('', { name: 'Sticky Note5', position: [416, 112] }))
	.add(sticky('', { name: 'Sticky Note6', position: [1472, 752] }))
	.add(sticky('', { name: 'Sticky Note7', position: [208, 1632] }))
	.add(sticky('', { name: 'Sticky Note8', position: [1760, 1680] }))
	.add(sticky('', { name: 'Sticky Note2', position: [1328, 304] }));
