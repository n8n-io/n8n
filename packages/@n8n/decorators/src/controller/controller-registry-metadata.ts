import { Service } from '@n8n/di';

import type { Controller, ControllerMetadata, HandlerName, RouteMetadata } from './types';

@Service()
export class ControllerRegistryMetadata {
	private registry = new Map<Controller, ControllerMetadata>();

	getControllerMetadata(controllerClass: Controller) {
		let metadata = this.registry.get(controllerClass);
		if (!metadata) {
			metadata = {
				basePath: '/',
				middlewares: [],
				routes: new Map(),
			};
			this.registry.set(controllerClass, metadata);
		}
		return metadata;
	}

	getRouteMetadata(controllerClass: Controller, handlerName: HandlerName) {
		const metadata = this.getControllerMetadata(controllerClass);
		let route = metadata.routes.get(handlerName);
		if (!route) {
			route = {} as RouteMetadata;
			route.args = [];
			metadata.routes.set(handlerName, route);
		}
		return route;
	}

	get controllerClasses() {
		return this.registry.keys();
	}
}
