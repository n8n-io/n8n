import 'reflect-metadata';

import type { Tracer } from 'tracing/*';
import type { IContext, IFunctions } from 'types/*';

export const CONTEXT_PARAMETER = Symbol('intento:context_parameter');

export function mapTo(key: string, collection?: string): ParameterDecorator {
	return function (target: object, _propertyKey: string | symbol | undefined, _parameterIndex: number) {
		const existing: unknown = Reflect.getMetadata(CONTEXT_PARAMETER, target) ?? [];
		const meta = [collection ? `${collection}.${key}` : key, ...(existing as string[])];
		Reflect.defineMetadata(CONTEXT_PARAMETER, meta, target);
	};
}

export class ContextFactory {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	static read<T extends IContext>(context: new (...args: any[]) => T, functions: IFunctions, tracer: Tracer): T {
		tracer.debug(`🔮 [Reflection] Reading context '${context.name}' ...`);

		const meta: unknown = Reflect.getMetadata(CONTEXT_PARAMETER, context) ?? [];
		if (!Array.isArray(meta) || meta.length === 0)
			tracer.bugDetected(context.name, 'No mapping metadata. Apply @mapTo decorator to all constructor parameters.');

		const paramTypes: unknown = Reflect.getMetadata('design:paramtypes', context) ?? [];
		if (!Array.isArray(paramTypes) || paramTypes.length === 0)
			tracer.bugDetected(context.name, "No type metadata found. Ensure 'emitDecoratorMetadata' is enabled in tsconfig.json.");
		if (paramTypes.length !== meta.length)
			tracer.bugDetected(context.name, `Partial metadata mapping: expected ${paramTypes.length}, got ${meta.length}`);

		const args = meta.map((key) => this.getNodeParameter(context.name, key as string, functions, tracer));
		const instance = new context(...args);
		try {
			instance.throwIfInvalid();
		} catch (error) {
			tracer.bugDetected(instance.constructor.name, error as Error, instance.asLogMetadata());
		}
		tracer.debug(`🔮 [Reflection] Valid context ${context.name} created successfully`);
		return instance;
	}

	private static getNodeParameter(context: string, key: string, functions: IFunctions, tracer: Tracer): unknown {
		try {
			tracer.debug(`🔮 [Reflection] Fetching node parameter '${key}' for context '${context}' ...`);
			const value = functions.getNodeParameter(key, 0, undefined, { extractValue: true });
			tracer.debug(`🔮 [Reflection] Node parameter '${key}' has been fetched`);
			return value;
		} catch (error) {
			tracer.debug(`🔮 [Reflection] Node parameter '${key}' has not been fetched. Reason: ${(error as Error).message}`);
			return undefined;
		}
	}
}
