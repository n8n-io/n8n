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
	/** @example [{ orderId: "ORD-456", status: "pending" }] */
	const orders = await http.get('https://api.com/pending');
	await processOrder(orders.orderId);
});
