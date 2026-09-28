import { resolvePublicApiRoutes } from '../../public-api-route-resolver';

import '../controllers';

describe('OpenTelemetry test trace Public API route', () => {
	it('registers the POST route with its scope and DTOs', () => {
		const route = resolvePublicApiRoutes().find(
			({ path, method }) => path === '/settings/otel/test-trace' && method === 'post',
		);

		expect(route?.apiKeyScope).toBe('otel:manage');
		expect(route?.successStatus).toBe(200);
		expect(route?.requestBodyDto).toBeDefined();
		expect(route?.responseDto).toBeDefined();
	});
});
