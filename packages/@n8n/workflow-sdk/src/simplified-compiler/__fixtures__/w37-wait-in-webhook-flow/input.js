import { onWebhook } from '@n8n/sdk';
import http from '@n8n/sdk/http';
import { wait, waitUntil } from '@n8n/sdk';

onWebhook({ method: 'POST', path: '/process' }, async ({ body }) => {
	const order = await http.post('https://api.example.com/orders', {
		item: body.item,
		quantity: body.quantity,
	});
	await waitUntil('2025-01-01T09:00:00Z');
	await http.post('https://api.example.com/ship', { orderId: order.id });
	await wait('1h');
	await http.post('https://api.example.com/notify', { orderId: order.id, status: 'shipped' });
});
