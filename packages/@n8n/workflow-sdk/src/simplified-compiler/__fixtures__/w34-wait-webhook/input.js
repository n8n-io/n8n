import { onManual } from '@n8n/sdk';
import http from '@n8n/sdk/http';
import { waitForWebhook } from '@n8n/sdk';

onManual(async () => {
	await waitForWebhook(async (resumeUrl) => {
		await http.post('https://api.example.com/start', { callbackUrl: resumeUrl });
	});
	await http.post('https://api.example.com/done', { status: 'completed' });
});
