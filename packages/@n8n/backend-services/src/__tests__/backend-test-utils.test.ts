import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { Container, Service } from '@n8n/di';

@Service()
class TestService {
	getValue() {
		return 'real';
	}
}

describe('@n8n/backend-test-utils', () => {
	it('uses the package DI container and exposes testDb', () => {
		const service = mockInstance(TestService, { getValue: () => 'mocked' });

		expect(Container.get(TestService)).toBe(service);
		expect(service.getValue()).toBe('mocked');
		expect(testDb.isReady()).toBe(false);
	});
});
