import { onManual } from '@n8n/sdk';
import http from '@n8n/sdk/http';
import { waitForForm } from '@n8n/sdk';

onManual(async () => {
	await http.post('https://api.example.com/prepare', { step: 'init' });
	const formData = await waitForForm({
		title: 'Enter Details',
		description: 'Please fill in the required information',
		fields: [
			{ label: 'Name', type: 'text' },
			{ label: 'Email', type: 'text' },
		],
	});
	await http.post('https://api.example.com/submit', {
		name: formData.Name,
		email: formData.Email,
	});
});
