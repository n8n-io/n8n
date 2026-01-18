const wf = workflow('JoBrqIuKn4cnNOJ0', 'Personal Appointment Booking', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: 'appointment-webhook',
					options: {},
					httpMethod: 'POST',
					responseMode: 'responseNode',
				},
				position: [620, 620],
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: 'https://api.cal.com/v1/slots',
							options: {},
							sendQuery: true,
							authentication: 'predefinedCredentialType',
							queryParameters: {
								parameters: [
									{ name: 'startTime', value: '={{ $json.body.startTime }}' },
									{
										name: 'endTime',
										value:
											"={{DateTime.fromISO($json.body.startTime, { zone: 'Asia/Kolkata' })\n  .set({ hour: 18, minute: 0, second: 0 })\n.format(\"yyyy-MM-dd'T'HH:mm:ssZZ\")}}",
									},
									{ name: 'eventTypeId', value: 'event_type_id' },
									{ name: 'timeZone', value: 'Asia/Kolkata' },
								],
							},
							nodeCredentialType: 'calApi',
						},
						credentials: { calApi: { id: 'credential-id', name: 'calApi Credential' } },
						position: [1040, 520],
						name: 'Check available slot in Cal.com',
					},
				}),
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: 'https://api.cal.com/v1/bookings',
							method: 'POST',
							options: {},
							jsonBody:
								'={\n  "eventTypeId": event_type_id,\n  "start": "{{ $json.body.startTime }}",\n  "end": "{{ DateTime.fromISO($json.body.startTime).plus({ minutes: 30 }).format("yyyy-MM-dd\'T\'HH:mm:ssZZ") }}",\n  "responses": {\n    "name": "{{ $json.body.name }}",\n    "email": "{{ $json.body.email }}"\n  },\n  "timeZone": "Asia/Kolkata",\n  "language": "en",\n  "title": "Test",\n"metadata":{}\n} ',
							sendBody: true,
							specifyBody: 'json',
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'calApi',
						},
						credentials: { calApi: { id: 'credential-id', name: 'calApi Credential' } },
						position: [1040, 720],
						name: 'Book an Appointment',
					},
				}),
			],
			{
				version: 2.2,
				parameters: {
					options: {},
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
								id: '249d32bd-5a1d-44fe-8b33-975827cef795',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.body.tool }}',
								rightValue: 'checkAvailableSlot',
							},
						],
					},
				},
				name: 'Check Is Request For Available Slot',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.2,
			config: { parameters: { options: {} }, position: [1320, 620], name: 'Respond to Webhook' },
		}),
	);
