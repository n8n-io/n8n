workflow({ name: 'F39: Webhook Switch Routing' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			params: {
				path: 'validate-booking-1234-abcd',
				options: {},
				httpMethod: 'POST',
				responseMode: 'responseNode',
				authentication: 'headerAuth',
			},
			credentials: { httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' } },
			version: 2,
		},
		(items) => {
			items.route(
				(item) =>
					item.json.body.attendee_name &&
					item.json.body.start &&
					item.json.body.attendee_phone &&
					item.json.body.attendee_email &&
					item.json.body.attendee_company &&
					item.json.body.notes
						? true
						: false,
				{
					true: (items) => {
						const create_booking = executeNode({
							type: 'n8n-nodes-base.httpRequest',
							name: 'Create booking',
							params: {
								url: 'https://api.cal.com/v2/bookings',
								method: 'POST',
								options: {},
								jsonBody: `{
  "attendee": {
    "language": "en",
    "name": "${item.json.body.attendee_name}",
    "timeZone": "${item.json.body.attendee_timezone}",
    "email": "${item.json.body.attendee_email}",
    "phoneNumber": "${item.json.body.attendee_phone}"
  },
  "start": "${item.json.body.start}",
  "eventTypeId": ${item.json.body.eventTypeId},
  "bookingFieldsResponses": {
    "phone": "${item.json.body.attendee_phone}",
    "company": "${item.json.body.attendee_company}",
    "notes": "${item.json.body.notes}"
  }
}`,
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
							version: 4.2,
						});
						const success_response = executeNode({
							type: 'n8n-nodes-base.respondToWebhook',
							name: 'Success response',
							params: {
								options: { responseCode: 200 },
								respondWith: 'text',
								responseBody: expr("Meeting booked for {{ $('Switch').item.json.body.start }}"),
							},
							version: 1.1,
						});
					},
					false: (items) => {
						const insufficient_data_response = executeNode({
							type: 'n8n-nodes-base.respondToWebhook',
							name: 'Insufficient data response',
							params: {
								options: {
									responseCode: 400,
									responseHeaders: {
										entries: [
											{
												name: 'bad_request',
												value:
													'User data provided is insufficient to book a meeting. Get complete data from user and try to book the meeting again.',
											},
										],
									},
								},
								respondWith: 'text',
								responseBody:
									'User data provided is insufficient to book a meeting. Get complete data from user and try to book the meeting again.',
							},
							version: 1.1,
						});
					},
				},
			);
		},
	);
});
