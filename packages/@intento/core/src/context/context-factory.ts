import 'reflect-metadata';

import type { Tracer } from 'tracing/*';
import type { IContext, IFunctions } from 'types/*';

export const CONTEXT_PARAMETER = Symbol('intento:context_parameter');

/**
 * Maps constructor parameter to n8n node parameter for context instantiation.
 *
 * Stores metadata for parameter resolution during context creation. Multiple decorators
 * on same class execute bottom-to-top, so order is preserved by prepending.
 *
 * @param key - Node parameter name to extract from n8n functions
 * @param collection - Optional parent collection name (creates dotted path: `collection.key`)
 * @throws CoreError if applied to non-constructor parameter
 */
export function mapTo(key: string, collection?: string): ParameterDecorator {
	return function (target: object, _propertyKey: string | symbol | undefined, _parameterIndex: number) {
		const existing: unknown = Reflect.getMetadata(CONTEXT_PARAMETER, target) ?? [];
		// NOTE: Decorators execute bottom-to-top, so we prepend to maintain left-to-right parameter order
		const meta = [collection ? `${collection}.${key}` : key, ...(existing as string[])];
		Reflect.defineMetadata(CONTEXT_PARAMETER, meta, target);
	};
}

/**
 * Factory for creating validated context instances using reflection metadata.
 *
 * Extracts node parameters based on @mapTo decorator metadata, instantiates context,
 * and validates constraints. Fails fast on metadata or validation errors to catch
 * bugs during development.
 */
export class ContextFactory {
	/**
	 * Creates and validates context instance from n8n node parameters.
	 *
	 * Uses reflection to read @mapTo metadata and extract parameters from n8n functions.
	 * Validates decorator coverage and parameter extraction before instantiation.
	 * O(n) where n = parameter count.
	 *
	 * @param context - Context class constructor with @mapTo decorated parameters
	 * @param functions - n8n IFunctions for parameter extraction
	 * @param tracer - Tracer for debug logging and error reporting
	 * @returns Validated context instance
	 * @throws Error if decorator coverage incomplete or validation fails (developer error)
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	static read<T extends IContext>(context: new (...args: any[]) => T, functions: IFunctions, tracer: Tracer): T {
		tracer.debug(`🔮 [Reflection] Reading context '${context.name}' ...`);

		// NOTE: All bugDetected calls indicate developer errors (missing decorators or tsconfig issues),
		// not runtime validation failures. These should be caught during development.
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

	/**
	 * Extracts node parameter value from n8n functions with fallback to undefined.
	 *
	 * Returns undefined if parameter doesn't exist or extraction fails. Callers handle
	 * missing required parameters during context validation.
	 *
	 * @param context - Context name for debug logging
	 * @param key - Node parameter name (may include dotted path for collections)
	 * @param functions - n8n IFunctions for parameter extraction
	 * @param tracer - Tracer for debug logging
	 * @returns Parameter value or undefined if not found
	 */
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
