const wf = workflow('5mGRqFpu73QguZPC', 'ocr Telegram - SAP', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['callback_query'], additionalFields: {} },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [-40, 640],
				name: 'Callback Waiting Answer',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'SI',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: 'c3ae2bff-a96d-4f42-b0b3-e04f8ef372d1',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.callback_query.data }}',
											rightValue: 'respuesta_si',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'NO',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: '59ccf0b4-bb12-4c10-b289-354be138f96c',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.callback_query.data }}',
											rightValue: 'respuesta_no',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [300, 640],
				name: 'Answer?',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $vars.url_sap }}Login',
					method: 'POST',
					options: { allowUnauthorizedCerts: true },
					jsonBody:
						'={\n       "UserName": "{{ $vars.user_sap }}",\n       "Password": "{{ $vars.password_sap }}",\n       "CompanyDB": "{{ $vars.company_db }}"\n}',
					sendBody: true,
					specifyBody: 'json',
				},
				position: [760, 520],
				name: 'Connect to SAP',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					sheetName: {
						__rl: true,
						mode: 'list',
						value: '',
						cachedResultUrl: '',
						cachedResultName: '',
					},
					documentId: { __rl: true, mode: 'list', value: '' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1160, 520],
				name: 'Get Header',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					sheetName: {
						__rl: true,
						mode: 'list',
						value: '',
						cachedResultUrl: '',
						cachedResultName: '',
					},
					documentId: { __rl: true, mode: 'list', value: '' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1560, 680],
				name: 'Get Row Details',
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
						'const items = $input.all();  // capturamos todos los items que entran\nconst DocumentLines = [];\n\nfor (let i = 0; i < items.length; i++) {\n  const item = items[i].json;\n\n  DocumentLines.push({\n    ItemCode: item.código,\n    Quantity: item.cantidad,\n    UnitPrice: item.precio\n  });\n}\n\nreturn [{ DocumentLines }];\n',
				},
				position: [1880, 680],
				name: 'Generate DocumentLines',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: {
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
				},
				position: [2240, 540],
				name: 'Merge',
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
						'const item = $json;\n\n// Construimos el objeto final para SAP\nreturn [{\n  DocDate: item.fecha_emision,\n  DocDueDate: item.fecha_emision,\n  CardCode: item.ruc_proveedor,\n  DocumentLines: item.DocumentLines\n}];',
				},
				position: [2580, 540],
				name: 'Create JSON',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $vars.url_sap }}PurchaseInvoices',
					body: '={{ JSON.stringify($json) }}',
					method: 'POST',
					options: { allowUnauthorizedCerts: true },
					sendBody: true,
					contentType: 'raw',
					sendHeaders: true,
					rawContentType: 'application/json',
					headerParameters: {
						parameters: [
							{
								name: 'Cookie',
								value: "=B1SESSION={{ $('Connect to SAP').item.json.SessionId }}",
							},
						],
					},
				},
				position: [2980, 540],
				name: 'POST PurchaseInvoices',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '=PurchaseInvoice {{ $json.DocEntry }} creada en SAP correctamente',
					chatId: "={{ $('Callback Waiting Answer').item.json.callback_query.message.chat.id }}",
					additionalFields: { appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [3360, 540],
				name: 'PurchaseInvoices created',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [760, 820], name: 'No Operation, do nothing' },
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				name: 'Trigger Receive Message',
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
								id: 'b6e43e6c-452f-4747-b17c-2de6191fb0f0',
								name: 'message.chat.id',
								type: 'number',
								value: '={{ $json.message.chat.id }}',
							},
							{
								id: 'a82f3829-5ce1-4a94-b7e0-a1449f7a3da6',
								name: 'message.chat',
								type: 'object',
								value: '={{ $json.message.chat }}',
							},
							{
								id: '619ffe10-2bea-4bda-a356-501562628bc5',
								name: 'telegram.file_id',
								type: 'string',
								value: '={{ $json.message.document.file_id }}',
							},
							{
								id: 'afbbdb8a-47e8-4b33-8f81-91989d1121af',
								name: 'message.caption',
								type: 'string',
								value: "={{ $('Trigger Receive Message').item.json.message.caption }}",
							},
						],
					},
				},
				position: [260, 0],
				name: 'Capture Telegram Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: 'Hemos recibido tu documento y lo estamos procesando...',
					chatId: '={{ $json.message.chat.id }}',
					additionalFields: { appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [500, 0],
				name: 'File Received',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId: "={{ $('Capture Telegram Data').item.json.telegram.file_id }}",
					resource: 'file',
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [720, 0],
				name: 'Download File',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.cloud.llamaindex.ai/api/v1/parsing/upload',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{
								name: 'file',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'data',
							},
						],
					},
					headerParameters: {
						parameters: [
							{ name: 'accept', value: 'application/json' },
							{
								name: 'Authorization',
								value: '=Bearer {{ $vars.llamaindex_apikey }}',
							},
						],
					},
				},
				position: [940, 0],
				name: 'Upload File LlamaIndex',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.cloud.llamaindex.ai/api/v1/parsing/job/{{ $json.id }}',
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [
							{ name: 'accept', value: 'application/json' },
							{
								name: 'Authorization',
								value: '=Bearer {{ $vars.llamaindex_apikey }}',
							},
						],
					},
				},
				position: [1180, 0],
				name: 'Validate Status LlamaIndex',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'SUCCESS',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: '7005abbb-4094-4dde-9cc5-b973fe54a09e',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'SUCCESS',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'PENDING',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: 'b4bdda84-6e9d-44c9-a85c-fd87d7427765',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.status }}',
											rightValue: 'PENDING',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [1400, 0],
				name: 'Status?',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.cloud.llamaindex.ai/api/v1/parsing/job/{{ $json.id }}/result/markdown',
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [
							{ name: 'accept', value: 'application/json' },
							{
								name: 'Authorization',
								value: '=Bearer {{ $vars.llamaindex_apikey }}',
							},
						],
					},
				},
				position: [1620, -100],
				name: 'Get Results LlamaIndex',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: '={{ $json.markdown }}',
					batching: {},
					messages: {
						messageValues: [
							{
								message:
									'Eres un asistente experto en extracción y procesamiento de datos de documentos especializado en identificar con precisión los detalles claves de una factura',
							},
							{
								type: 'HumanMessagePromptTemplate',
								message:
									'=Tu tarea: Extraer de cualquier texto de factura los siguientes campos, devolviendo los datos en un JSON estructurado y con máxima precisión:\n\nCampos a extraer:\nnombre_proveedor: Nombre del proveedor.\n\nruc_proveedor: RUC del proveedor.\n\ndireccion_proveedor: Dirección del proveedor.\n\nnumero_factura: Número de factura.\n\nfecha_emision: Fecha de emisión de la factura (formato YYYY-MM-DD).\n\ndetalle_productos: Lista de líneas de detalle de los productos o servicios facturados. Cada línea incluirá:\n\ncodigo\n\ndescripcion\n\ncantidad\n\nprecio\n\nsubtotal\n\nsubtotal_factura: Subtotal general de la factura.\n\ndescuento_factura: Descuento total de la factura.\n\ntotal_neto: Total neto de la factura.\n\nFormato de salida esperado:\nSi algún campo no existe, deberá devolverse como null.\nDevuelve siempre el JSON con los nombres exactos de las claves.\n\nEjemplo de salida esperado:\n\n{\n  "nombre_proveedor": "Blockies Corporation",\n  "ruc_proveedor": "78787878-7",\n  "direccion_proveedor": "AV. DE LAS ARTES NORTE NRO. 310 (ESPALDA RAMBLA DE JAVIER PRADO) LIMA - LIMA - SAN BORJA",\n  "numero_factura": "00003",\n  "fecha_emision": "2025-04-15",\n  "detalle_productos": [\n    {\n      "codigo": "srv001",\n      "descripcion": "Servicio de Alquiler de Montacargas",\n      "cantidad": 1,\n      "precio": 35.00,\n      "subtotal": 35.00\n    }\n  ],\n  "subtotal_factura": 35.00,\n  "descuento_factura": 0.00,\n  "total_neto": 35.00\n}\nInstrucciones adicionales:\nNo resumas, no expliques, no añadas comentarios, solo responde con el JSON.\n\nSi existen varias líneas de productos, incluir todas dentro del array "detalle_productos".\n\nNo redondees importes, extrae exactamente el valor mostrado.\n\nLas fechas deben estar siempre en formato YYYY-MM-DD.',
							},
						],
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							name: 'OpenAI Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n  "nombre_proveedor": "Blockies Corporation",\n  "ruc_proveedor": "78787878-7",\n  "direccion_proveedor": "AV. DE LAS ARTES NORTE NRO. 310 (ESPALDA RAMBLA DE JAVIER PRADO) LIMA - LIMA - SAN BORJA",\n  "numero_factura": "00003",\n  "fecha_emision": "2025-04-15",\n  "detalle_productos": [\n    {\n      "codigo": "srv001",\n      "descripcion": "Servicio de Alquiler de Montacargas",\n      "cantidad": 1,\n      "precio": 35.00,\n      "subtotal": 35.00\n    }\n  ],\n  "subtotal_factura": 35.00,\n  "descuento_factura": 0.00,\n  "total_neto": 35.00\n}',
							},
							name: 'Structured Output Parser (Example)',
						},
					}),
				},
				position: [1840, -100],
				name: 'Basic LLM Chain',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'output.detalle_productos' },
				position: [2280, -100],
				name: 'Split Out',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							precio: "={{ $('Split Out').item.json.precio }}",
							código: "={{ $('Split Out').item.json.codigo }}",
							cantidad: "={{ $('Split Out').item.json.cantidad }}",
							subtotal: "={{ $('Split Out').item.json.subtotal }}",
							descripcion: "={{ $('Split Out').item.json.descripcion }}",
							numero_factura: "={{ $('Basic LLM Chain').item.json.output.numero_factura }}",
						},
						schema: [
							{
								id: 'numero_factura',
								type: 'string',
								display: true,
								required: false,
								displayName: 'numero_factura',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'código',
								type: 'string',
								display: true,
								required: false,
								displayName: 'código',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'descripcion',
								type: 'string',
								display: true,
								required: false,
								displayName: 'descripcion',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'cantidad',
								type: 'string',
								display: true,
								required: false,
								displayName: 'cantidad',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'precio',
								type: 'string',
								display: true,
								required: false,
								displayName: 'precio',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'subtotal',
								type: 'string',
								display: true,
								required: false,
								displayName: 'subtotal',
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
					documentId: { __rl: true, mode: 'list', value: '' },
				},
				position: [2480, 80],
				name: 'Detail',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					operation: 'append',
					sheetName: { __rl: true, mode: 'list', value: '' },
					documentId: { __rl: true, mode: 'list', value: '' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2620, -100],
				name: 'Header',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '=¿Quieres enviar los datos a SAP?',
					chatId: "={{ $('Capture Telegram Data').item.json.message.chat.id }}",
					replyMarkup: 'inlineKeyboard',
					inlineKeyboard: {
						rows: [
							{
								row: {
									buttons: [
										{
											text: 'Si',
											additionalFields: { callback_data: 'respuesta_si' },
										},
										{
											text: 'No',
											additionalFields: { callback_data: 'respuesta_no' },
										},
									],
								},
							},
						],
					},
					additionalFields: { appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [2900, -100],
				name: '¿Upload to SAP?',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 3 }, position: [1620, 100], name: 'Wait' },
		}),
	)
	.add(
		sticky('## Waiting for an answer on telegram', {
			position: [-140, 460],
			width: 3720,
			height: 560,
		}),
	)
	.add(
		sticky('## Send data and OCR with LlamaIndex\n', {
			name: 'Sticky Note1',
			color: 7,
			position: [-120, -180],
			width: 3280,
			height: 540,
		}),
	);
