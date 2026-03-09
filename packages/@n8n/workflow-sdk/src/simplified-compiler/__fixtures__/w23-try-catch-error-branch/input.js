import { onManual } from '@n8n/sdk';
import http from '@n8n/sdk/http';

onManual(async () => {
	const config = { endpoint: 'https://api.example.com' };

	let data = null;
	try {
		data = await http.get('https://api.example.com/users');
	} catch {
		await http.post('https://hooks.slack.com/error', { msg: 'fetch failed' });
	}

	if (data) {
		await http.post('https://api.example.com/process', data);
	}
});
