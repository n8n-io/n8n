import { onManual } from '@n8n/sdk';
import http from '@n8n/sdk/http';

async function fetchData(url) {
	const result = await http.get(url);
	return result;
}

onManual(async () => {
	const data = await fetchData('https://api.example.com/data');
	await http.post('https://slack.com/notify', { info: data.name });
});
