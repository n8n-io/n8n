import { onWebhook } from '@n8n/sdk';
import http from '@n8n/sdk/http';

/** @example [{ body: { userId: "user-123" } }] */
onWebhook({ method: 'POST', path: '/dashboard' }, async ({ body }) => {
	const userId = body.userId;

	const [users, orders] = await Promise.all([
		http.get('https://api.example.com/users'),
		http.get('https://api.example.com/orders'),
	]);

	await http.post('https://api.example.com/dashboard', {
		userCount: users.length,
		orderCount: orders.length,
		requestedBy: userId,
	});
});
