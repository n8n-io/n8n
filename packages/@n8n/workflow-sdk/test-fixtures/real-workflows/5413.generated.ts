const wf = workflow('M4IIL41O16twgImq', 'Image Reader', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['message'], additionalFields: { download: true } },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [-400, -220],
				name: 'Telegram Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'c8cd1608-2326-401d-9c47-79a6a72f5fc7',
								name: 'chatID',
								type: 'number',
								value: '={{ $json.message.chat.id }}',
							},
							{
								id: '0f1a41cb-8630-4e10-b445-f6bbbcf91d33',
								name: 'Image',
								type: 'string',
								value:
									'={{ $json["message"]["photo"][$json["message"]["photo"].length - 1]["file_id"] }}',
							},
						],
					},
				},
				position: [-180, -220],
				name: 'Clean Input Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId: "={{ $json.Image.replace(/\\n/g, '') }}",
					resource: 'file',
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [40, -220],
				name: 'get file',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-tesseractjs.tesseractNode',
			version: 1,
			config: { parameters: { options: {} }, position: [260, -220], name: 'Tesseract OCR' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '={{ $json.text }}',
					options: {
						systemMessage:
							'Kamu adalah asisten AI yang dirancang untuk memperjelas teks hasil ekstraksi gambar melalui OCR.\n\nTujuan utamamu adalah membuat hasil OCR menjadi mudah dibaca dan dipahami oleh pengguna dengan cara merapikan format, memperbaiki kesalahan pengenalan karakter, dan menyusun ulang konten agar lebih logis.\n\n🧠 Panduan Perilaku:\nJika teks hasil OCR menyerupai tabel atau data terstruktur, jangan buat ulang dalam bentuk tabel. Sebagai gantinya, ubah menjadi poin-poin ringkas agar lebih mudah dibaca.\n\nFokus pada kejelasan, akurasi, dan format yang ramah pengguna.\n\nPerbaiki masalah umum pada hasil OCR seperti:\n\n- Kata atau kalimat yang terpotong\n- Karakter yang salah dikenali \n𝑐\n𝑜\n𝑛\n𝑡\n𝑜\nℎ\n:\n"\n0\n"\n𝑑\n𝑎\n𝑛\n"\n𝑂\n"\n,\n"\n1\n"\n𝑑\n𝑎\n𝑛\n"\n𝐼\n"\ncontoh:"0"dan"O","1"dan"I"\n- Simbol yang salah tempat atau format yang berantakan\n\nWAJIB Perhatikan, karena pesan ini akan dikirim ke Telegram maka hindari penggunaan karakter markdown seperti _, *, \n,\n,, \n,\n,, ~, >, #, +, -, =, |, {, }, ., !',
					},
					promptType: 'define',
				},
				position: [480, -220],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"let text = $json.output;\n\ntext = text\n  .replace(/[_*[\\]()~`>#+\\-=|{}.!]/g, '\\\\$&'); // Escape karakter markdown V2\n\nreturn { json: { output: text } };\n",
				},
				position: [856, -220],
				name: 'Replace',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '={{ $json.output }}',
					chatId: "={{ $('Clean Input Data').item.json.chatID }}",
					additionalFields: { appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1076, -220],
				name: 'Telegram',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {}, modelName: 'models/gemini-2.0-flash' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [568, 0],
				name: 'Google Gemini Chat Model',
			},
		}),
	);
