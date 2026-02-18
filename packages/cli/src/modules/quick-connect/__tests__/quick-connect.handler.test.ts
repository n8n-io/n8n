import type { IQuickConnectHandler } from '../handlers/quick-connect.handler';
import { QuickConnectHandlerRegistry } from '../handlers/quick-connect.handler';

describe('QuickConnectHandlerRegistry', () => {
	let registry: QuickConnectHandlerRegistry;

	beforeEach(() => {
		registry = new QuickConnectHandlerRegistry();
	});

	const createMockHandler = (credentialType: string): IQuickConnectHandler => ({
		credentialType,
		getCredentialData: jest.fn().mockResolvedValue({ token: 'test-token' }),
	});

	it('should register a handler correctly', () => {
		const handler = createMockHandler('testApi');

		registry.register(handler);

		expect(registry.get('testApi')).toBe(handler);
	});

	it('should overwrite handler on duplicate registration', () => {
		const handler1 = createMockHandler('testApi');
		const handler2 = createMockHandler('testApi');

		registry.register(handler1);
		registry.register(handler2);

		expect(registry.get('testApi')).toBe(handler2);
		expect(registry.get('testApi')).not.toBe(handler1);
	});

	it('should register multiple handlers for different credential types', () => {
		const handler1 = createMockHandler('api1');
		const handler2 = createMockHandler('api2');

		registry.register(handler1);
		registry.register(handler2);

		expect(registry.get('api1')).toBe(handler1);
		expect(registry.get('api2')).toBe(handler2);
	});

	it('should return undefined for unregistered credential type', () => {
		expect(registry.get('nonExistentType')).toBeUndefined();
	});
});
