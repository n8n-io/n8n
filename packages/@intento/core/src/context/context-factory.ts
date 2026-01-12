import 'reflect-metadata';

import type { Tracer } from 'tracing/*';
import type { IContext, IFunctions } from 'types/*';

/**
 * Metadata key for storing parameter mapping configuration on constructor parameters.
 *
 * Used by @mapTo decorator to track which n8n node parameters should be injected
 * into each constructor argument during context instantiation.
 */
export const CONTEXT_PARAMETER = Symbol('intento:context_parameter');

/**
 * Decorator that maps a constructor parameter to an n8n node parameter.
 *
 * Maps constructor parameters to n8n node parameters for automatic injection by ContextFactory.
 * Supports both flat parameters and collection-nested parameters.
 *
 * @param key - The n8n node parameter name to extract
 * @param collection - Optional collection name if parameter is nested
 * @returns Parameter decorator that stores mapping metadata
 *
 * @example
 * ```typescript
 * class ExecutionContext {
 *   constructor(
 *     @mapTo('max_attempts', 'execution_context') maxAttempts: number
 *   ) {}
 * }
 * ```
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
 * Factory for creating context instances with automatic parameter injection from n8n nodes.
 *
 * Uses reflection and @mapTo decorators to automatically extract node parameters
 * and inject them into context constructors. Validates metadata completeness
 * and context validity before returning instances.
 */
export class ContextFactory {
	/**
	 * Creates and validates a context instance from n8n node parameters.
	 *
	 * Reads @mapTo decorator metadata to determine parameter extraction strategy,
	 * fetches values from n8n node, instantiates context, and validates result.
	 * Fails fast on metadata issues before instantiation.
	 *
	 * @param context - Context class constructor with @mapTo decorated parameters
	 * @param functions - n8n IFunctions for parameter extraction
	 * @param tracer - Tracer for debug logging and error reporting
	 * @returns Validated context instance
	 * @throws Never throws - uses tracer.bugDetected for all failures
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	static read<T extends IContext>(context: new (...args: any[]) => T, functions: IFunctions, tracer: Tracer): T {
		tracer.debug(`🔮 [Reflection] Reading context '${context.name}' ...`);

		// NOTE: Validate decorator coverage before attempting parameter extraction
		const meta: unknown = Reflect.getMetadata(CONTEXT_PARAMETER, context) ?? [];
		if (!Array.isArray(meta) || meta.length === 0)
			tracer.bugDetected(context.name, 'No mapping metadata. Apply @mapTo decorator to all constructor parameters.');

		// NOTE: Verify TypeScript emitDecoratorMetadata is enabled for parameter type reflection
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
	 * Extracts a single parameter value from n8n node with safe error handling.
	 *
	 * Uses extractValue option to retrieve values from collections and nested structures.
	 * Returns undefined for missing parameters instead of throwing, allowing contexts
	 * to use default parameter values.
	 *
	 * @param context - Context name for error messages
	 * @param key - Parameter key (may include dot notation for nested values)
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
			// NOTE: Return undefined to allow constructor default parameters to take effect
			tracer.debug(`🔮 [Reflection] Node parameter '${key}' has not been fetched. Reason: ${(error as Error).message}`);
			return undefined;
		}
	}
}
