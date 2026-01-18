const wf = workflow(
	'IyhsZQh7TFAGsDqL',
	'Automate WhatsApp bookings with an AI assistant and smart SMS reminders (24/7)',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: '6438cd95-74cb-4f40-a1a5-853706fe96f6',
					options: {},
					httpMethod: 'POST',
					responseMode: 'responseNode',
				},
				position: [-960, -80],
				name: 'Webhook Trigger (WhatsApp Input)',
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: '@n8n/n8n-nodes-langchain.agent',
					version: 1.8,
					config: {
						parameters: {
							text: '=input :  {{ $json.body.userInput }}',
							options: {
								systemMessage:
									"=#IMPORTANT  \nLes rendez-vous ne peuvent être pris qu’après avoir collecté le nom, l’e-mail/Courriel et le service choisi.\n\n#IDENTITÉ  \nVous êtes l’assistant de Dr Firas, coach expert en automatisation n8n, sur WhatsApp.\n\n#CONTEXTE  \n- Dr Firas propose des coachings et ateliers en ligne pour maîtriser n8n  \n- Horaires : du lundi au vendredi, 9 h–18 h (heure de Paris)  \n- Français et anglais possibles\n- La date d'aujourd'hui est : {{$now}}\n\n#SERVICES ET MAPPING (CRITIQUE)  \n- « Audit express n8n » (30 min) – 40 $ – Event ID : 2638115  \n- « Coaching Workflow n8n » (60 min) – 65 $ – Event ID : 2638127  \n- « Atelier Automatisation Avancée » (90 min) – 99 $ – Event ID : 2638131  \n\nQuand l’utilisateur choisit un service, mémorisez l’Event ID correspondant.\n\n#TON  \nDynamique, professionnel et chaleureux. Emojis légers 👍🤖.\n\n#FLUX DE CONVERSATION\n\n## 1. Accueil  \n« Bonjour ! Je suis l’assistant de Dr Firas, prêt à vous guider pour votre session n8n. Puis-je vous poser quelques questions ? »\n\n## 2. Choix du service (une question à la fois)  \na) « Quel service souhaitez-vous ? »  \n- Si « je ne sais pas » ou « que proposez-vous » → listez les 3 services avec durée, prix et bénéfice court.  \n- Sinon, continuez.\n\n## 3. Collecte des infos client  \n« Parfait ! Pour réserver votre [nom du service], j’ai besoin de votre prénom et de votre e-mail. »\n\n→ Après avoir reçu nom + e-mail/Courriel , enregistrez dans le Google Sheet Prospect (nom, e-mail, téléphone={{ $json.body.phoneNumber }}, service, Event ID, résumé).\n\n## 4. Proposition de créneaux  \n« Souhaitez-vous voir les disponibilités immédiatement ? »  \n- Si oui :  \n  1. Appelez l’outil **Get Availability** avec :  \n     - Event ID du service  \n     - startTime = maintenant (ISO 8601, UTC, ex. `2025-06-13T12:00:00Z`)  \n     - endTime = +48 h (ISO 8601, UTC)  \n     - max 5 créneaux  \n  2. Convertissez chaque horaire UTC en heure de Paris (+02:00) et affichez-les en plain text (ex. “14:30”).\n\n## 5. Choix du créneau  \n« Lequel de ces créneaux vous convient ? »  \n- L’utilisateur répond date+heure →  \n  - Demandez « Tapez “oui” pour confirmer ce créneau ».  \n  - À « oui », enregistrez via Google Sheet Update_Leads (nom, e-mail, service, Event ID, date+heure).  \n  - Puis : « Votre rendez-vous est fixé au [date] à [heure] (heure de Paris). Tapez “confirm” pour finaliser. »\n\n## 6. Confirmation finale  \n- À “confirm” →  \n  - Confirmez la réservation et rappelez la politique d’annulation 24 h à l’avance.  \n  - Proposez un lien d’ajout au calendrier si besoin.\n\n#CONTRAINTES OUTIL “Get Availability”  \n- Toujours ISO 8601 UTC  \n- startTime = maintenant, endTime = +48 h  \n- Maximum 5 créneaux  \n- Plain text, < 400 car.\n\n#RÈGLES GÉNÉRALES  \n- Une question à la fois  \n- Ne jamais redemander une info déjà fournie  \n- “RESET” relance la conversation depuis le début  \n",
							},
							promptType: 'define',
						},
						subnodes: {
							memory: memory({
								type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
								version: 1.3,
								config: {
									parameters: {
										sessionKey: '={{ $json.body.contactId }}',
										sessionIdType: 'customKey',
										contextWindowLength: 50,
									},
									name: 'AI Conversation Memory',
								},
							}),
							model: languageModel({
								type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
								version: 1.2,
								config: {
									parameters: {
										model: {
											__rl: true,
											mode: 'list',
											value: 'gpt-4o',
											cachedResultName: 'gpt-4o',
										},
										options: {},
									},
									credentials: {
										openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
									},
									name: 'LLM: GPT-4o Chat Model',
								},
							}),
							tools: [
								tool({
									type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
									version: 1.1,
									config: {
										parameters: {
											url: 'https://api.cal.com/v2/slots/available',
											sendQuery: true,
											sendHeaders: true,
											parametersQuery: {
												values: [
													{ name: 'eventTypeId' },
													{ name: 'startTime' },
													{ name: 'endTime' },
												],
											},
											toolDescription:
												'Appelez cet outil pour récupérer la disponibilité des rendez-vous.\nVous devez impérativement utiliser le fuseau horaire de Paris.\nRespectez strictement le format ISO pour les dates, par exemple :\n2025-01-01T09:00:00-02:00\nExemple de schéma d’entrée :\n{\n  "startTime": "...",\n  "endTime": "..."\n}',
											parametersHeaders: {
												values: [
													{
														name: 'Authorization',
														value: 'Bearer YOUR_TOKEN_HERE',
														valueProvider: 'fieldValue',
													},
													{
														name: 'Content-Type',
														value: 'application/json',
														valueProvider: 'fieldValue',
													},
												],
											},
										},
										name: 'Fetch Available Time Slots',
									},
								}),
								tool({
									type: 'n8n-nodes-base.googleSheetsTool',
									version: 4.5,
									config: {
										parameters: {
											columns: {
												value: {
													Nom: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Nom', ``, 'string') }}",
													Courriel:
														"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Courriel', ``, 'string') }}",
													Résumé:
														"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('R_sum_', `ici il y a le résumé de toute la conversation`, 'string') }}",
													'ID du contact': '={{ $json.body.contactId }}',
													'Numéro de téléphone': '={{ $json.body.phoneNumber }}',
												},
												schema: [
													{
														id: 'Nom',
														type: 'string',
														display: true,
														required: false,
														displayName: 'Nom',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Courriel',
														type: 'string',
														display: true,
														required: false,
														displayName: 'Courriel',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Numéro de téléphone',
														type: 'string',
														display: true,
														required: false,
														displayName: 'Numéro de téléphone',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Résumé',
														type: 'string',
														display: true,
														required: false,
														displayName: 'Résumé',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Réservé',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Réservé',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Nom de l’événement',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Nom de l’événement',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'ID de l’événement',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'ID de l’événement',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Date du rendez-vous',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Date du rendez-vous',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Rappel SMS envoyé',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Rappel SMS envoyé',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'ID du contact',
														type: 'string',
														display: true,
														removed: false,
														required: false,
														displayName: 'ID du contact',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
												],
												mappingMode: 'defineBelow',
												matchingColumns: ['ID du contact'],
												attemptToConvertTypes: false,
												convertFieldsToString: false,
											},
											options: {},
											operation: 'appendOrUpdate',
											sheetName: {
												__rl: true,
												mode: 'list',
												value: 'gid=0',
												cachedResultUrl:
													'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit#gid=0',
												cachedResultName: 'mes RDV',
											},
											documentId: {
												__rl: true,
												mode: 'list',
												value: '1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc',
												cachedResultUrl:
													'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit?usp=drivesdk',
												cachedResultName: 'MES RDV',
											},
										},
										credentials: {
											googleSheetsOAuth2Api: {
												id: 'credential-id',
												name: 'googleSheetsOAuth2Api Credential',
											},
										},
										name: 'Create New Prospect in Google Sheet',
									},
								}),
								tool({
									type: 'n8n-nodes-base.googleSheetsTool',
									version: 4.5,
									config: {
										parameters: {
											columns: {
												value: {
													'ID du contact': '={{ $json.body.contactId }}',
													'Date du rendez-vous':
														"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Date_du_rendez-vous', ``, 'string') }}",
													'ID de l’événement':
														"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('ID_de_l__v_nement', ``, 'string') }}",
													'Nom de l’événement':
														"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Nom_de_l__v_nement', ``, 'string') }}",
												},
												schema: [
													{
														id: 'Nom',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Nom',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Courriel',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Courriel',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Numéro de téléphone',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Numéro de téléphone',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Résumé',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Résumé',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Réservé',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Réservé',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Nom de l’événement',
														type: 'string',
														display: true,
														removed: false,
														required: false,
														displayName: 'Nom de l’événement',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'ID de l’événement',
														type: 'string',
														display: true,
														removed: false,
														required: false,
														displayName: 'ID de l’événement',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Date du rendez-vous',
														type: 'string',
														display: true,
														removed: false,
														required: false,
														displayName: 'Date du rendez-vous',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'Rappel SMS envoyé',
														type: 'string',
														display: true,
														removed: true,
														required: false,
														displayName: 'Rappel SMS envoyé',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
													{
														id: 'ID du contact',
														type: 'string',
														display: true,
														removed: false,
														required: false,
														displayName: 'ID du contact',
														defaultMatch: false,
														canBeUsedToMatch: true,
													},
												],
												mappingMode: 'defineBelow',
												matchingColumns: ['ID du contact'],
												attemptToConvertTypes: false,
												convertFieldsToString: false,
											},
											options: {},
											operation: 'update',
											sheetName: {
												__rl: true,
												mode: 'list',
												value: 'gid=0',
												cachedResultUrl:
													'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit#gid=0',
												cachedResultName: 'mes RDV',
											},
											documentId: {
												__rl: true,
												mode: 'list',
												value: '1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc',
												cachedResultUrl:
													'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit?usp=drivesdk',
												cachedResultName: 'MES RDV',
											},
										},
										credentials: {
											googleSheetsOAuth2Api: {
												id: 'credential-id',
												name: 'googleSheetsOAuth2Api Credential',
											},
										},
										name: 'Update Prospect with Booking Details',
									},
								}),
							],
						},
						position: [40, -460],
						name: 'AI Booking Assistant (Dr Firas)',
					},
				}),
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.5,
					config: {
						parameters: {
							options: {},
							filtersUI: {
								values: [
									{
										lookupValue:
											"={{ $('Webhook Trigger (WhatsApp Input)').item.json.body.contactId }}",
										lookupColumn: 'ID du contact',
									},
								],
							},
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit#gid=0',
								cachedResultName: 'mes RDV',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit?usp=drivesdk',
								cachedResultName: 'MES RDV',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [-420, 140],
						name: 'Retrieve Prospect Details',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Discussion',
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
											id: '2b0aa9e5-7215-435b-8b66-fddb9973c7d0',
											operator: { type: 'string', operation: 'notContains' },
											leftValue: '={{ $json.body.userInput }}',
											rightValue: 'confirm',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Confirm booking',
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
											id: 'ed81f2e7-f97d-4581-bc84-ed703db2ec08',
											operator: { type: 'string', operation: 'contains' },
											leftValue: '={{ $json.body.userInput }}',
											rightValue: 'confirm',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'Switch: Confirm vs Chat Flow',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.1,
			config: {
				parameters: { options: {}, respondWith: 'allIncomingItems' },
				position: [700, -460],
				name: 'Send Response to WhatsApp',
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
						'const input = $input.first().json[\'Date du rendez-vous\']; // e.g.,\n"2025-06-04T09:00:00+02:00"\nfunction normalizeToUTCZFormat(dateString) {\ntry {\nif\n(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$/.test(dateString)\n) {\nreturn new Date(dateString).toISOString();\n}\nconst date = new Date(dateString);\nif (isNaN(date.getTime())) {\nthrow new Error("Invalid date format");\n}\nreturn date.toISOString(); // Returns in UTC with Z\n} catch (e) {\nreturn `Invalid input: ${e.message}`;\n}\n}\nreturn [\n{\njson: {\noriginal: input,\nnormalized: normalizeToUTCZFormat(input),\n},\n},\n];',
				},
				position: [-200, 140],
				name: 'Normalize Booking Time (UTC Format)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.cal.com/v2/bookings',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n"eventTypeId": {{ $(\'Retrieve Prospect Details\').item.json[\'ID de l’événement\'] }},\n"start": "{{ $json.normalized }}",\n"attendee": {\n"name": "{{ $(\'Retrieve Prospect Details\').item.json.Nom }}",\n"email": "{{ $(\'Retrieve Prospect Details\').item.json.Courriel }}",\n"timeZone": "Europe/Paris"\n},\n"bookingFieldsResponses": {\n"title": "{{ $(\'Retrieve Prospect Details\').item.json[\'Résumé\'] }}"\n}\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' },
							{ name: 'Content-Type', value: 'application/json' },
							{ name: 'cal-api-version', value: '2024-08-13' },
						],
					},
				},
				position: [20, 140],
				name: 'Send Booking',
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
						'const input = $(\'Retrieve Prospect Details\').first().json[\'Date du rendez-vous\']; \nfunction formatToReadableDate(dateString) {\ntry {\nconst date = new Date(dateString);\nif (isNaN(date.getTime())) throw new Error("Invalid date");\nconst options = {\ntimeZone: "Europe/Berlin", // Ensures correct local time\nmonth: "long",\nday: "numeric",\nhour: "numeric",\nminute: "2-digit",\nhour12: true,\n};\nconst formatted = date.toLocaleString("en-US", options);\n// Example output: "June 4, 09:00 AM" → make it shorter like\n"June 4, 9am"\nreturn formatted\n.replace(":00", "") // remove :00 if exact hour\n.replace("AM", "am")\n.replace("PM", "pm");\n} catch (e) {\nreturn `Invalid input: ${e.message}`;\n}\n}\nreturn [\n{\njson: {\noriginal: input,\nformatted: formatToReadableDate(input),\n},\n},\n]; ',
				},
				position: [240, 140],
				name: 'Format Date for Readability (Display)',
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.respondToWebhook',
					version: 1.1,
					config: {
						parameters: {
							options: {},
							respondWith: 'json',
							responseBody:
								'\n[\n{\n"output": "Votre réservation a été effectuée avec succès. Vous recevrez bientôt un e-mail de confirmation pour votre massage, RDV : ."\n}\n]',
						},
						position: [700, -20],
						name: 'Webhook Response: Booking Confirmed',
					},
				}),
				node({
					type: 'n8n-nodes-base.respondToWebhook',
					version: 1.1,
					config: {
						parameters: {
							options: {},
							respondWith: 'json',
							responseBody:
								'[\n{\n"output": "Il semble que le créneau horaire que vous avez choisi ne soit plus disponible. Veuillez en sélectionner un autre."\n}\n]',
						},
						position: [700, 280],
						name: 'Webhook Response: Booking Failed',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'succeeded',
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
											id: 'cbf9b691-0bc1-4a14-b35d-96664d82bc91',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: "={{ $('Send Booking').item.json.status }}",
											rightValue: 'success',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Failed',
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
											id: 'f78214f9-ecd4-4913-aef0-9a2a453b052c',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: "={{ $('Send Booking').item.json.status }}",
											rightValue: 'error',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'Check Booking Status (Success or Error)',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							Réservé: 'confirm',
							'ID du contact': "={{ $('Retrieve Prospect Details').item.json['ID du contact'] }}",
						},
						schema: [
							{
								id: 'Nom',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Nom',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Courriel',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Courriel',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Numéro de téléphone',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Numéro de téléphone',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Résumé',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Résumé',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Réservé',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Réservé',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Nom de l’événement',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Nom de l’événement',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ID de l’événement',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'ID de l’événement',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Date du rendez-vous',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Date du rendez-vous',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Rappel SMS envoyé',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Rappel SMS envoyé',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ID du contact',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'ID du contact',
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
						matchingColumns: ['ID du contact'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit#gid=0',
						cachedResultName: 'mes RDV',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit?usp=drivesdk',
						cachedResultName: 'MES RDV',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [920, 140],
				name: 'Mark Booking as Confirmed in Sheet',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ field: 'hours' }] } },
				position: [-420, 580],
				name: 'Trigger: Check Appointments Every Hour',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit#gid=0',
						cachedResultName: 'mes RDV',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1PsuURJg5nxVnb18OMDShjC-sTA9i_32pyBSjfswOpqc/edit?usp=drivesdk',
						cachedResultName: 'MES RDV',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-200, 580],
				name: 'Read Upcoming Appointments from Sheet',
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
						'const nowParis = new Date(\n  new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })\n);\nconst nowTimestamp = nowParis.getTime();\nconst twoHoursFromNow = nowTimestamp + 2 * 60 * 60 * 1000;\n\nreturn items\n  .filter(item => {\n    const booked = item.json["Réservé"]?.toLowerCase() === "confirm";\n    const reminderSent = item.json["Rappel SMS envoyé"]?.toLowerCase() === "envoyer";\n    const rawDate = item.json["Date du rendez-vous"];\n    if (!booked || reminderSent || !rawDate) {\n      return false;\n    }\n\n    const appointmentTimestamp = Date.parse(rawDate);\n    return appointmentTimestamp > nowTimestamp &&\n           appointmentTimestamp <= twoHoursFromNow;\n  })\n  .map(item => {\n    const rawDate = item.json["Date du rendez-vous"];\n    const date = new Date(rawDate);\n    if (isNaN(date.getTime())) {\n      item.json.appointmentDisplayTime = "(Invalid date)";\n      return item;\n    }\n\n    const options = {\n      timeZone: "Europe/Paris",\n      month: "long",\n      day: "numeric",\n      hour: "numeric",\n      minute: "2-digit",\n      hour12: true\n    };\n\n    const formatted = date.toLocaleString("en-US", options)\n      .replace(":00", "")\n      .replace("AM", "AM")\n      .replace("PM", "PM");\n\n    item.json.appointmentDisplayTime = formatted;\n    return item;\n  });\n',
				},
				position: [20, 580],
				name: 'Filter Appointments Within Next 2 Hours',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.sms77',
			version: 1,
			config: {
				parameters: {
					to: "={{ $('Read Upcoming Appointments from Sheet').item.json['Numéro de téléphone'] }}",
					message:
						"=Bonjour {{ $json.Nom }}, ceci est un petit rappel : votre rendez-vous pour {{ $json['Nom de l’événement'] }} est prévu dans les 2 prochaines heures ",
					options: {},
				},
				credentials: {
					sms77Api: { id: 'credential-id', name: 'sms77Api Credential' },
				},
				position: [240, 580],
				name: 'Send SMS Reminder',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							'ID du contact':
								"={{ $('Read Upcoming Appointments from Sheet').item.json['ID du contact'] }}",
							'Rappel SMS envoyé': 'envoyer',
						},
						schema: [
							{
								id: 'Nom',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Nom',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Courriel',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Courriel',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Numéro de téléphone',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Numéro de téléphone',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Résumé',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Résumé',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Réservé',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Réservé',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Nom de l’événement',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Nom de l’événement',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ID de l’événement',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'ID de l’événement',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Date du rendez-vous',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Date du rendez-vous',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Rappel SMS envoyé',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Rappel SMS envoyé',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ID du contact',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'ID du contact',
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
						matchingColumns: ['ID du contact'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [460, 580],
				name: 'Mark SMS as Sent in Sheet',
			},
		}),
	)
	.add(
		sticky('# 🟩 STEP 3 — Send SMS Reminder Before Appointment\n\n', {
			color: 4,
			position: [-500, 480],
			width: 1620,
			height: 280,
		}),
	)
	.add(
		sticky('# 🟫 STEP 1 — Qualify User and Suggest Appointment', {
			name: 'Sticky Note1',
			position: [-500, -540],
			width: 1620,
			height: 460,
		}),
	)
	.add(
		sticky('# 🟥 STEP 2 — Book Appointment Automatically\n\n', {
			name: 'Sticky Note3',
			color: 3,
			position: [-500, -60],
			width: 1620,
			height: 520,
		}),
	);
