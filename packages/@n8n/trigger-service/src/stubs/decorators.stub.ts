/**
 * Stub decorators for trigger-service
 * These are no-op decorators that won't actually hook into lifecycle events
 */

// No-op decorator factory
function noopDecorator() {
	return function (_target: any, _propertyKey?: string, _descriptor?: PropertyDescriptor) {
		// no-op
	};
}

export function OnShutdown() {
	return noopDecorator();
}

export function OnLeaderTakeover() {
	return noopDecorator();
}

export function OnLeaderStepdown() {
	return noopDecorator();
}

export function OnPubSubEvent(_eventName: string) {
	return noopDecorator();
}

export function Post(_path?: string, _options?: unknown): ClassDecorator & MethodDecorator {
	return noopDecorator() as any;
}

export function RestController(_basePath: string): ClassDecorator {
	return function (_target: any) {
		// no-op
	};
}
