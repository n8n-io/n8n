import { onManual } from '@n8n/sdk';
import http from '@n8n/sdk/http';
import { wait } from '@n8n/sdk';

onManual(async () => {
	const data = await http.get('https://api.example.com/start');
	await wait('5s');
	const result = await http.get('https://api.example.com/check');
	setTimeout(async () => {
		await http.post('https://api.example.com/finish', { status: 'done' });
	}, 120000);
});
