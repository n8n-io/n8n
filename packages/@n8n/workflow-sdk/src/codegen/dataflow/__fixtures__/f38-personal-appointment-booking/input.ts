workflow({ name: 'F38: Personal Appointment Booking' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			params: {
				path: 'appointment-webhook',
				options: {},
				httpMethod: 'POST',
				responseMode: 'responseNode',
			},
			version: 2,
		},
		(items) => {
			items.branch(
				(item) => item.json.body.tool === 'checkAvailableSlot',
				(items) => {
					const check_available_slot_in_Cal_com = executeNode({
						type: 'n8n-nodes-base.httpRequest',
						name: 'Check available slot in Cal.com',
						params: {
							url: 'https://api.cal.com/v1/slots',
							options: {},
							sendQuery: true,
							authentication: 'predefinedCredentialType',
							queryParameters: {
								parameters: [
									{ name: 'startTime', value: item.json.body.startTime },
									{
										name: 'endTime',
										value: expr(
											"{{DateTime.fromISO($json.body.startTime, { zone: 'Asia/Kolkata' })\n  .set({ hour: 18, minute: 0, second: 0 })\n.format(\"yyyy-MM-dd'T'HH:mm:ssZZ\")}}",
										),
									},
									{ name: 'eventTypeId', value: 'event_type_id' },
									{ name: 'timeZone', value: 'Asia/Kolkata' },
								],
							},
							nodeCredentialType: 'calApi',
						},
						credentials: { calApi: { id: 'credential-id', name: 'calApi Credential' } },
						version: 4.2,
					});
					const respond_to_Webhook = executeNode({
						type: 'n8n-nodes-base.respondToWebhook',
						name: 'Respond to Webhook',
						params: { options: {} },
						version: 1.2,
					});
				},
				(items) => {
					const book_an_Appointment = executeNode({
						type: 'n8n-nodes-base.httpRequest',
						name: 'Book an Appointment',
						params: {
							url: 'https://api.cal.com/v1/bookings',
							method: 'POST',
							options: {},
							jsonBody: expr(
								'{\n  "eventTypeId": event_type_id,\n  "start": "{{ $json.body.startTime }}",\n  "end": "{{ DateTime.fromISO($json.body.startTime).plus({ minutes: 30 }).format("yyyy-MM-dd\'T\'HH:mm:ssZZ") }}",\n  "responses": {\n    "name": "{{ $json.body.name }}",\n    "email": "{{ $json.body.email }}"\n  },\n  "timeZone": "Asia/Kolkata",\n  "language": "en",\n  "title": "Test",\n"metadata":{}\n} ',
							),
							sendBody: true,
							specifyBody: 'json',
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'calApi',
						},
						credentials: { calApi: { id: 'credential-id', name: 'calApi Credential' } },
						version: 4.2,
					});
				},
			);
		},
	);
});
