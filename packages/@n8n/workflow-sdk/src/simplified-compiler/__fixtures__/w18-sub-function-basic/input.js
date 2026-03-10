import { onWebhook, onSchedule } from '@n8n/sdk';
import http from '@n8n/sdk/http';

async function processOrder(orderId) {
	const enriched = await http.get('https://api.com/orders/' + orderId);
	await http.post('https://api.com/crm', enriched);
}

/** @example [{ body: { id: "ORD-123", product: "Widget Pro", quantity: 5 } }] */
onWebhook({ method: 'POST', path: '/orders' }, async ({ body }) => {
	await processOrder(body.id);
	await http.post('https://notify.com/done');
});

onSchedule({ every: '1h' }, async () => {
	const orders = await http.get('https://api.com/pending');
	await processOrder(orders.orderId);
});
