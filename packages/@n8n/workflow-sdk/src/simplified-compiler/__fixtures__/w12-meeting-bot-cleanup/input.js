onSchedule({ every: '1m' }, async () => {
	const events = await http.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
		auth: { type: 'oauth2', credential: 'Google Calendar' },
	});

	for (const event of events) {
		if (event.status === 'confirmed') {
			await http.post(
				'https://gateway.vexa.ai/bots',
				{
					platform: 'google_meet',
					native_meeting_id: 'meeting123',
				},
				{ auth: { type: 'bearer', credential: 'Vexa API' } },
			);
		}

		if (event.status === 'cancelled') {
			await http.delete('https://gateway.vexa.ai/bots/meeting123', {
				auth: { type: 'bearer', credential: 'Vexa API' },
			});
		}
	}
});
