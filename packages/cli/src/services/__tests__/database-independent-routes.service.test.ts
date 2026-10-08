import { DatabaseIndependentRoutes } from '@/services/database-independent-routes.service';

describe('DatabaseIndependentRoutes', () => {
	it.each([
		['/metrics', '/metrics'],
		['/metrics', '/metrics/'],
		['/metrics/', '/metrics'],
		['/metrics/', '/metrics/'],
	])('should match registered path %s for request path %s', (registered, requested) => {
		const routes = new DatabaseIndependentRoutes();
		routes.add(registered);

		expect(routes.has(requested)).toBe(true);
	});

	it('should not match an unregistered path', () => {
		const routes = new DatabaseIndependentRoutes();
		routes.add('/metrics');

		expect(routes.has('/healthz')).toBe(false);
	});
});
