import { onWebhook } from '@n8n/sdk';
import http from '@n8n/sdk/http';

onWebhook({ method: 'POST', path: '/process' }, async ({ body }) => {
	try {
		const data = await http.get('https://api.example.com/data');

		switch (data.type) {
			case 'email':
				await http.post('https://api.example.com/email', { to: data.recipient });
				break;
			case 'sms':
				await http.post('https://api.example.com/sms', { phone: data.phone });
				break;
			default:
				await http.post('https://api.example.com/log', { message: 'Unknown type' });
				break;
		}
	} catch {
		await http.post('https://api.example.com/errors', { error: 'Processing failed' });
	}
});
