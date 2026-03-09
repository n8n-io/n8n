onWebhook({ method: 'POST', path: '/orders' }, async ({ body }) => {
	const order = body;

	await http.post('https://api.warehouse.io/v1/fulfill', {
		orderId: order.id,
		items: order.items,
	});

	await http.post('https://hooks.slack.com/services/T00/B00/xxx', {
		text: 'New order ' + order.id + ' sent to fulfillment',
	});
});

onWebhook({ method: 'POST', path: '/returns' }, async ({ body }) => {
	const ret = body;

	await http.post('https://api.warehouse.io/v1/returns', {
		orderId: ret.orderId,
		reason: ret.reason,
	});

	await http.post('https://hooks.slack.com/services/T00/B00/xxx', {
		text: 'Return requested for order ' + ret.orderId,
	});
});

onSchedule({ every: '1h' }, async () => {
	const inventory = await http.get('https://api.warehouse.io/v1/inventory');

	if (inventory.lowStockCount > 0) {
		await http.post('https://hooks.slack.com/services/T00/B00/xxx', {
			text: 'Low stock alert: ' + inventory.lowStockCount + ' items below threshold',
		});
	}
});
