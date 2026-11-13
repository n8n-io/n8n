/**
 * The order example: a webhook receives an order, the workflow checks the
 * stock of each item, asks for approval when stock is short, and charges
 * the customer in a try/catch.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

interface OrderItem {
	sku: string;
	qty: number;
	price: number;
}

interface Order {
	orderId: string;
	customer: { id: string; email: string };
	items: OrderItem[];
}

interface Stock {
	sku: string;
	available: number;
}

export default workflow({
	triggers: [webhook<Order>({ path: 'orders', method: 'POST' })],
	credentials: { payments: { type: 'httpHeaderAuth' } },
	async run(ctx, trigger) {
		const order = trigger.body;
		const short: string[] = [];
		let total = 0;
		for (const item of order.items) {
			const stock = await ctx.http<Stock>({
				name: 'Check stock',
				method: 'GET',
				url: `https://inventory.example.com/stock/${item.sku}`,
			});
			if (stock.body.available < item.qty) short.push(item.sku);
			total += item.qty * item.price;
		}
		if (short.length > 0) {
			const decision = await ctx.approval({
				name: 'Approve short order',
				message: `Order ${order.orderId} is short on ${short.join(', ')}`,
				via: 'slack',
			});
			if (!decision.approved) {
				await ctx.respond({ name: 'Reject', status: 409, body: { orderId: order.orderId, short } });
				return { status: 'rejected', by: decision.by };
			}
		}
		try {
			const charge = await ctx.http<{ id: string }>({
				name: 'Charge',
				method: 'POST',
				url: 'https://payments.example.com/charges',
				body: { customer: order.customer.id, amount: Math.round(total * 100) },
				credential: 'payments',
			});
			await ctx.respond({
				name: 'Confirm',
				body: { orderId: order.orderId, chargeId: charge.body.id },
			});
			return { status: 'charged', total, chargeId: charge.body.id };
		} catch (e) {
			await ctx.respond({ name: 'Payment failed', status: 402, body: { error: e.message } });
			return { status: 'failed', error: e.message, step: e.step };
		}
	},
});
