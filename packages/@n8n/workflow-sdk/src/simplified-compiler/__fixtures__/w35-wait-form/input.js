import { onManual } from '@n8n/sdk';
import http from '@n8n/sdk/http';
import { waitForForm, waitUntil } from '@n8n/sdk';

onManual(async () => {
	await waitForForm({
		title: 'Approval Required',
		fields: [
			{ label: 'Decision', type: 'select', options: ['Approve', 'Reject'] },
			{ label: 'Notes', type: 'text' },
		],
	}, async (formUrl) => {
		await http.post('https://slack.com/api/chat.postMessage', {
			text: 'Please review: ' + formUrl,
		});
	});
	await waitUntil('2024-12-25T00:00:00Z');
	await http.post('https://api.example.com/complete', { status: 'done' });
});
