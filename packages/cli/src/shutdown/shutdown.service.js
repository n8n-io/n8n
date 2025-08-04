'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ShutdownService = exports.ComponentShutdownError = void 0;
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
class ComponentShutdownError extends n8n_workflow_1.UnexpectedError {
	constructor(componentName, cause) {
		super('Failed to shutdown gracefully', {
			cause,
			extra: { component: componentName },
		});
	}
}
exports.ComponentShutdownError = ComponentShutdownError;
let ShutdownService = class ShutdownService {
	constructor(logger, errorReporter, shutdownMetadata) {
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.shutdownMetadata = shutdownMetadata;
	}
	register(priority, handler) {
		this.shutdownMetadata.register(priority, handler);
	}
	validate() {
		const handlers = this.shutdownMetadata.getHandlersByPriority().flat();
		for (const { serviceClass, methodName } of handlers) {
			if (!di_1.Container.has(serviceClass)) {
				throw new n8n_workflow_1.UserError(
					`Component "${serviceClass.name}" is not registered with the DI container. Any component using @OnShutdown() must be decorated with @Service()`,
				);
			}
			const service = di_1.Container.get(serviceClass);
			if (!service[methodName]) {
				throw new n8n_workflow_1.UserError(
					`Component "${serviceClass.name}" does not have a "${methodName}" method`,
				);
			}
		}
	}
	shutdown() {
		if (this.shutdownPromise) {
			throw new n8n_workflow_1.UnexpectedError('App is already shutting down');
		}
		this.shutdownPromise = this.startShutdown();
	}
	async waitForShutdown() {
		if (!this.shutdownPromise) {
			throw new n8n_workflow_1.UnexpectedError('App is not shutting down');
		}
		await this.shutdownPromise;
	}
	isShuttingDown() {
		return !!this.shutdownPromise;
	}
	async startShutdown() {
		const handlers = Object.values(this.shutdownMetadata.getHandlersByPriority()).reverse();
		for (const handlerGroup of handlers) {
			await Promise.allSettled(
				handlerGroup.map(async (handler) => await this.shutdownComponent(handler)),
			);
		}
	}
	async shutdownComponent({ serviceClass, methodName }) {
		const name = `${serviceClass.name}.${methodName}()`;
		try {
			this.logger.debug(`Shutting down component "${name}"`);
			const service = di_1.Container.get(serviceClass);
			const method = service[methodName];
			await method.call(service);
		} catch (error) {
			(0, n8n_workflow_1.assert)(error instanceof Error);
			this.errorReporter.error(new ComponentShutdownError(name, error));
		}
	}
};
exports.ShutdownService = ShutdownService;
exports.ShutdownService = ShutdownService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.ErrorReporter,
			decorators_1.ShutdownMetadata,
		]),
	],
	ShutdownService,
);
//# sourceMappingURL=shutdown.service.js.map
