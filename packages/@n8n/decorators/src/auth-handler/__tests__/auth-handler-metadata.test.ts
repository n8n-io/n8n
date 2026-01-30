/* eslint-disable @typescript-eslint/require-await */
import { Container, Service } from '@n8n/di';

import type { AuthHandlerClass, IPasswordAuthHandler } from '../auth-handler';
import { AuthHandler, AuthHandlerEntryMetadata } from '../auth-handler-metadata';

describe('AuthHandlerEntryMetadata', () => {
	let metadata: AuthHandlerEntryMetadata;

	beforeEach(() => {
		metadata = new AuthHandlerEntryMetadata();
	});

	it('should register handler classes', () => {
		class TestHandler implements IPasswordAuthHandler<object> {
			metadata = { name: 'test', type: 'password' as const };
			readonly userClass = Object;
			async handleLogin() {
				return undefined;
			}
		}
		metadata.register({ class: TestHandler as AuthHandlerClass });

		expect(metadata.getClasses()).toContain(TestHandler);
	});

	it('should return all registered entries', () => {
		class Handler1 implements IPasswordAuthHandler<object> {
			metadata = { name: 'test1', type: 'password' as const };
			readonly userClass = Object;
			async handleLogin() {
				return undefined;
			}
		}
		class Handler2 implements IPasswordAuthHandler<object> {
			metadata = { name: 'test2', type: 'password' as const };
			readonly userClass = Object;
			async handleLogin() {
				return undefined;
			}
		}

		metadata.register({ class: Handler1 as AuthHandlerClass });
		metadata.register({ class: Handler2 as AuthHandlerClass });

		const entries = metadata.getEntries();
		expect(entries).toHaveLength(2);
	});

	it('should return all registered classes', () => {
		class Handler1 implements IPasswordAuthHandler<object> {
			metadata = { name: 'test1', type: 'password' as const };
			readonly userClass = Object;
			async handleLogin() {
				return undefined;
			}
		}
		class Handler2 implements IPasswordAuthHandler<object> {
			metadata = { name: 'test2', type: 'password' as const };
			readonly userClass = Object;
			async handleLogin() {
				return undefined;
			}
		}

		metadata.register({ class: Handler1 as AuthHandlerClass });
		metadata.register({ class: Handler2 as AuthHandlerClass });

		const classes = metadata.getClasses();
		expect(classes).toEqual([Handler1, Handler2]);
	});
});

describe('@AuthHandler decorator', () => {
	beforeEach(() => {
		Container.reset();
	});

	it('should register handler in metadata', () => {
		@AuthHandler()
		class TestAuthHandler implements IPasswordAuthHandler<object> {
			metadata = { name: 'test', type: 'password' as const };
			readonly userClass = Object;
			async handleLogin() {
				return undefined;
			}
		}

		const metadata = Container.get(AuthHandlerEntryMetadata);
		const registeredClasses = metadata.getClasses();

		expect(registeredClasses).toContain(TestAuthHandler);
	});

	it('should enable dependency injection', () => {
		@AuthHandler()
		class TestAuthHandler implements IPasswordAuthHandler<object> {
			metadata = { name: 'test', type: 'password' as const };
			readonly userClass = Object;
			async handleLogin() {
				return undefined;
			}
		}

		const instance = Container.get(TestAuthHandler);
		expect(instance).toBeInstanceOf(TestAuthHandler);
		expect(instance.metadata.name).toBe('test');
		expect(instance.metadata.type).toBe('password');
	});

	it('should support handlers with dependencies', () => {
		@Service()
		class Logger {
			log(message: string) {
				return message;
			}
		}

		@AuthHandler()
		class TestAuthHandler implements IPasswordAuthHandler<object> {
			metadata = { name: 'test', type: 'password' as const };
			constructor(private logger: Logger) {}
			readonly userClass = Object;

			async handleLogin() {
				this.logger.log('login');
				return undefined;
			}
		}

		const instance = Container.get(TestAuthHandler);
		expect(instance).toBeInstanceOf(TestAuthHandler);
	});
});
