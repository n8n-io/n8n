import { onManual } from '@n8n/sdk';
import http from '@n8n/sdk/http';

async function notifyTeam(message) {
	await http.post('https://slack.com/api/chat.postMessage', { text: message });
}

onManual(async () => {
	const data = await http.get('https://api.example.com/status');
	await notifyTeam(data.summary);
});
