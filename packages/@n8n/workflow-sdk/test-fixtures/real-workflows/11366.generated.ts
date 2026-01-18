const wf = workflow('39xV6u2Xhx3NHIYt', '{Template} kaizenCrypto', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: { position: [-240, 192], name: 'Telegram Trigger' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [80, 192], name: 'Code in JavaScript' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: { position: [400, 0], name: '15 min' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [608, 0], name: 'Edit Fields' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [1088, 176], name: 'Merge' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [1312, 192], name: 'Combine candlestick' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [1664, 464], name: 'Merge1' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 3,
			config: { position: [2064, 464], name: 'Crypto Agent' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [2464, 464], name: 'Send a text message' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: { position: [400, 192], name: '1 hour' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [608, 192], name: 'Edit Fields1' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: { position: [400, 400], name: '1 day' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { position: [608, 400], name: 'Edit Fields2' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: { position: [512, 704], name: 'News' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [768, 704], name: 'Filtering News' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: { position: [1072, 704], name: 'News sentiment Analyzer' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: { position: [2064, 688], name: 'Google Gemini Chat Model1' },
		}),
	)
	.add(sticky('', { position: [368, -256] }))
	.add(sticky('', { name: 'Sticky Note1', position: [368, 656] }))
	.add(sticky('', { name: 'Sticky Note2', position: [1024, 656] }))
	.add(sticky('', { name: 'Sticky Note3', position: [2000, 192] }))
	.add(sticky('', { name: 'Sticky Note4', position: [2368, 192] }))
	.add(sticky('', { name: 'Sticky Note5', position: [-304, -16] }))
	.add(sticky('', { name: 'Sticky Note6', position: [1056, -16] }))
	.add(sticky('', { name: 'Sticky Note7', position: [720, 656] }))
	.add(sticky('', { name: 'Sticky Note8', position: [1600, 288] }))
	.add(sticky('', { name: 'Sticky Note9', position: [-1552, -48] }));
