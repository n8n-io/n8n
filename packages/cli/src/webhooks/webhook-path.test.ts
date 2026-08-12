import {
	applyWebhookNamespace,
	isDynamicWebhookPath,
	normalizeStoredWebhookPath,
	pickWebhookNamespace,
	splitNamespacedWebhookPath,
	templateSegments,
	trimWebhookPath,
} from './webhook-path';

describe('trimWebhookPath', () => {
	test.each([
		['/orders', 'orders'],
		['orders/', 'orders'],
		['/orders/', 'orders'],
		['  /orders/  ', 'orders'],
		['orders', 'orders'],
		['', ''],
	])('%s -> %s', (input, expected) => {
		expect(trimWebhookPath(input)).toBe(expected);
	});
});

describe('isDynamicWebhookPath', () => {
	test.each([
		[':id', true],
		['orders/:id', true],
		['a/b/:c/d', true],
		['orders', false],
		['a/b', false],
		['', false],
	])('%s -> %s', (input, expected) => {
		expect(isDynamicWebhookPath(input)).toBe(expected);
	});
});

describe('applyWebhookNamespace', () => {
	test('prefixes a dynamic path', () => {
		expect(applyWebhookNamespace('orders/:id', 'shop')).toBe('shop/orders/:id');
	});

	test('leaves a static path alone', () => {
		expect(applyWebhookNamespace('orders', 'shop')).toBe('orders');
	});

	test('is idempotent', () => {
		const once = applyWebhookNamespace('orders/:id', 'shop');
		expect(applyWebhookNamespace(once, 'shop')).toBe(once);
	});

	test('leaves the path alone without a namespace', () => {
		expect(applyWebhookNamespace('orders/:id', undefined)).toBe('orders/:id');
	});

	test('does not treat a namespace-only match as needing a prefix', () => {
		expect(applyWebhookNamespace(':id', ':id')).toBe(':id');
	});
});

describe('pickWebhookNamespace', () => {
	test('takes the first non-empty string', () => {
		expect(pickWebhookNamespace(undefined, '', 'shop', 'other')).toBe('shop');
	});

	test('ignores non-string candidates', () => {
		expect(pickWebhookNamespace(() => 'shop', 42, 'uuid')).toBe('uuid');
	});

	test('returns undefined when nothing is usable', () => {
		expect(pickWebhookNamespace(undefined, null, 7)).toBeUndefined();
	});
});

describe('splitNamespacedWebhookPath', () => {
	test('splits a namespaced dynamic path', () => {
		expect(splitNamespacedWebhookPath('shop/orders/:id')).toEqual({
			namespace: 'shop',
			pathLength: 2,
		});
	});

	test('counts a single trailing param', () => {
		expect(splitNamespacedWebhookPath('uuid/:id')).toEqual({ namespace: 'uuid', pathLength: 1 });
	});

	test('returns undefined for a static path', () => {
		expect(splitNamespacedWebhookPath('shop/orders')).toBeUndefined();
	});

	test('returns undefined when the first segment is itself a param', () => {
		expect(splitNamespacedWebhookPath(':id')).toBeUndefined();
	});
});

describe('templateSegments', () => {
	test('drops the namespace segment', () => {
		expect(templateSegments('shop/orders/:id')).toEqual(['orders', ':id']);
	});
});

describe('normalizeStoredWebhookPath', () => {
	test('namespaces a dynamic path and derives its lookup keys', () => {
		const webhook: { webhookPath: string; webhookId?: string; pathLength?: number } = {
			webhookPath: '/team/:id/',
		};
		normalizeStoredWebhookPath(webhook, 'hook-id');

		expect(webhook).toEqual({
			webhookPath: 'hook-id/team/:id',
			webhookId: 'hook-id',
			pathLength: 2,
		});
	});

	test('leaves a static path unnamespaced and unindexed', () => {
		const webhook: { webhookPath: string; webhookId?: string; pathLength?: number } = {
			webhookPath: '/shop/orders/',
		};
		normalizeStoredWebhookPath(webhook, 'shop');

		expect(webhook.webhookPath).toBe('shop/orders');
		expect(webhook.webhookId).toBeUndefined();
		expect(webhook.pathLength).toBeUndefined();
	});

	test('is safe to re-run', () => {
		const webhook: { webhookPath: string; webhookId?: string; pathLength?: number } = {
			webhookPath: 'team/:id',
		};
		normalizeStoredWebhookPath(webhook, 'hook-id');
		const first = { ...webhook };
		normalizeStoredWebhookPath(webhook, 'hook-id');

		expect(webhook).toEqual(first);
	});

	test('pathLength counts the segments after the namespace, matching the lookup', () => {
		const webhook: { webhookPath: string; webhookId?: string; pathLength?: number } = {
			webhookPath: 'user/:id/posts',
		};
		normalizeStoredWebhookPath(webhook, 'uuid');

		const requestPath = 'uuid/user/42/posts';
		const [, ...requestSegments] = requestPath.split('/');
		expect(webhook.pathLength).toBe(requestSegments.length);
	});
});
