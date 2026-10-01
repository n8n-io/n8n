import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

type ControllerClass = new (...args: never[]) => unknown;

export function getControllerMetadata(Controller: ControllerClass) {
	return Container.get(ControllerRegistryMetadata).getControllerMetadata(Controller as never);
}

export function getRouteCases(Controller: ControllerClass) {
	const metadata = getControllerMetadata(Controller);
	return Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));
}

export function getRoutesByHandlerName(Controller: ControllerClass) {
	return new Map(getRouteCases(Controller).map(({ handlerName, route }) => [handlerName, route]));
}
