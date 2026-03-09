import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// Branch A: POST /orders webhook chain
	const s1 = nock('https://api.warehouse.io')
		.post('/v1/fulfill')
		.reply(200, { fulfillmentId: 'ful_001', status: 'processing' });

	const s2 = nock('https://hooks.slack.com')
		.post('/services/T00/B00/xxx')
		.reply(200, { ok: true })
		.persist();

	// Branch B: POST /returns webhook chain
	const s3 = nock('https://api.warehouse.io')
		.post('/v1/returns')
		.reply(200, { returnId: 'ret_001', status: 'accepted' });

	// Branch C: Schedule — inventory check
	const s4 = nock('https://api.warehouse.io')
		.get('/v1/inventory')
		.reply(200, {
			lowStockCount: 3,
			totalProducts: 150,
			items: [
				{ sku: 'SKU-001', name: 'Widget A', stock: 2, threshold: 10 },
				{ sku: 'SKU-002', name: 'Widget B', stock: 5, threshold: 10 },
				{ sku: 'SKU-003', name: 'Gadget C', stock: 1, threshold: 5 },
			],
		});

	return [s1, s2, s3, s4];
}
