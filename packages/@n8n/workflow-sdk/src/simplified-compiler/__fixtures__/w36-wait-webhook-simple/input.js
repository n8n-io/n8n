import { onManual } from '@n8n/sdk';
import http from '@n8n/sdk/http';
import { waitForWebhook } from '@n8n/sdk';

onManual(async () => {
	await http.post('https://api.example.com/start', { status: 'pending' });
	/** @example [{ body: { decision: "approved" } }] */
	const approval = await waitForWebhook();
	await http.post('https://api.example.com/complete', {
		decision: approval.body.decision,
	});
});
