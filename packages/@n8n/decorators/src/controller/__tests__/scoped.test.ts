import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { GlobalScope, ProjectScope } from '../scoped';
import type { Controller } from '../types';

describe('Scope Decorators', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	describe('@GlobalScope', () => {
		it('should set global scope on route metadata', () => {
			const scope: Scope = 'user:read';

			class TestController {
				@GlobalScope(scope)
				testMethod() {}
			}

			const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'testMethod',
			);

			expect(routeMetadata.accessScope).toEqual({
				scope,
				globalOnly: true,
			});
		});

		it('should work with different scopes', () => {
			class TestController {
				@GlobalScope('user:read')
				readUserMethod() {}

				@GlobalScope('user:create')
				createUserMethod() {}

				@GlobalScope('user:delete')
				deleteUserMethod() {}
			}

			const readMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'readUserMethod',
			);

			const createMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'createUserMethod',
			);

			const deleteMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'deleteUserMethod',
			);

			expect(readMetadata.accessScope).toEqual({ scope: 'user:read', globalOnly: true });
			expect(createMetadata.accessScope).toEqual({ scope: 'user:create', globalOnly: true });
			expect(deleteMetadata.accessScope).toEqual({ scope: 'user:delete', globalOnly: true });
		});
	});

	describe('@ProjectScope', () => {
		it('should set project scope on route metadata', () => {
			const scope: Scope = 'workflow:read';

			class TestController {
				@ProjectScope(scope)
				testMethod() {}
			}

			const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'testMethod',
			);

			expect(routeMetadata.accessScope).toEqual({
				scope,
				globalOnly: false,
			});
		});

		it('should work with different scopes', () => {
			class TestController {
				@ProjectScope('workflow:read')
				readWorkflowMethod() {}

				@ProjectScope('workflow:create')
				createWorkflowMethod() {}

				@ProjectScope('workflow:delete')
				deleteWorkflowMethod() {}
			}

			const readMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'readWorkflowMethod',
			);

			const createMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'createWorkflowMethod',
			);

			const deleteMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'deleteWorkflowMethod',
			);

			expect(readMetadata.accessScope).toEqual({ scope: 'workflow:read', globalOnly: false });
			expect(createMetadata.accessScope).toEqual({ scope: 'workflow:create', globalOnly: false });
			expect(deleteMetadata.accessScope).toEqual({ scope: 'workflow:delete', globalOnly: false });
		});
	});

	it('should work with both scope types on the same controller', () => {
		class TestController {
			@GlobalScope('user:read')
			readUserMethod() {}

			@ProjectScope('workflow:read')
			readWorkflowMethod() {}
		}

		const userMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'readUserMethod',
		);

		const workflowMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'readWorkflowMethod',
		);

		expect(userMetadata.accessScope).toEqual({ scope: 'user:read', globalOnly: true });
		expect(workflowMetadata.accessScope).toEqual({ scope: 'workflow:read', globalOnly: false });
	});

	it('should work alongside other decorators', () => {
		// Assuming we have a Get decorator imported
		const Get = (path: string) => {
			return (target: object, handlerName: string | symbol) => {
				const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
					target.constructor as Controller,
					String(handlerName),
				);
				routeMetadata.method = 'get';
				routeMetadata.path = path;
			};
		};

		class TestController {
			@Get('/users')
			@GlobalScope('user:read')
			getUsers() {}

			@Get('/workflows')
			@ProjectScope('workflow:read')
			getWorkflows() {}
		}

		const usersMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'getUsers',
		);

		const workflowsMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'getWorkflows',
		);

		expect(usersMetadata.method).toBe('get');
		expect(usersMetadata.path).toBe('/users');
		expect(usersMetadata.accessScope).toEqual({ scope: 'user:read', globalOnly: true });

		expect(workflowsMetadata.method).toBe('get');
		expect(workflowsMetadata.path).toBe('/workflows');
		expect(workflowsMetadata.accessScope).toEqual({ scope: 'workflow:read', globalOnly: false });
	});
});
