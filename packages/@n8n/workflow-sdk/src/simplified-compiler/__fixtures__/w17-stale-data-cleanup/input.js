import { onSchedule } from '@n8n/sdk';
import http from '@n8n/sdk/http';

onSchedule({ cron: '0 2 * * *' }, async () => {
	const items = await http.get('https://api.app.com/items?status=stale', {
		auth: { type: 'basic', credential: 'App API' },
	});
	for (const item of items) {
		await http.delete('https://api.app.com/items/' + item.id, {
			auth: { type: 'basic', credential: 'App API' },
		});
	}
});
