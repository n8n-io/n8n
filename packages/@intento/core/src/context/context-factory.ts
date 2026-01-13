import 'reflect-metadata';

import type { Tracer } from 'tracing/*';
import type { IContext, IFunctions } from 'types/*';

/**
 * Metadata key for storing n8n parameter mappings on context constructors.
 *
 * Used by @mapTo decorator to attach parameter key names to constructor parameters
 * via reflect-metadata, enabling automatic extraction from n8n node parameters.
 */
export const CONTEXT_PARAMETER = Symbol('intento:context_parameter');

/**
 * Parameter decorator that maps constructor parameters to n8n node parameters.
 *
 * Enables automatic context instantiation from workflow node configuration by storing
 * parameter key mappings in reflection metadata. Supports both flat and nested collection
 * parameters with dot notation.
 *
 * @param key - n8n node parameter key to extract value from
 * @param collection - Optional parent collection key for nested parameters (uses dot notation)
 * @returns Parameter decorator function for constructor parameters
 *
 * @example
 * ```typescript
 * class MyContext implements IContext {
 *   constructor(
 *     @mapTo('enabled') enabled: boolean,
 *     @mapTo('timeout', 'options') timeout: number  // Reads from options.timeout
 *   ) { }
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
 * Factory for creating validated context objects from n8n node parameters.
 *
 * Uses reflection metadata attached by @mapTo decorators to automatically extract
 * and map node parameters to constructor arguments. Validates decorator coverage
 * and TypeScript configuration before instantiation to fail fast on setup errors.
 */
export class ContextFactory {
	/**
	 * Creates and validates context instance from n8n node parameters.
	 *
	 * Extraction order:
	 * 1) Validate decorator metadata exists,
	 * 2) Validate TypeScript emitDecoratorMetadata enabled,
	 * 3) Extract parameters,
	 * 4) Instantiate,
	 * 5) Validate.
	 * All validation failures call tracer.bugDetected() which throws and halts execution.
	 *
	 * @param context - Context class constructor with @mapTo decorated parameters
	 * @param functions - n8n execution context for parameter extraction
	 * @param tracer - Tracer for structured logging and error reporting
	 * @returns Validated context instance ready for use
	 * @throws NodeOperationError via tracer.bugDetected() if decorator coverage incomplete,
	 *         TypeScript config invalid, or validation fails
	 *
	 * @example
	 * ```typescript
	 * const context = ContextFactory.read(SplitContext, functions, tracer);
	 * // context is validated and ready to use
	 * ```
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	static read<T extends IContext>(context: new (...args: any[]) => T, functions: IFunctions, tracer: Tracer): T {
		tracer.debug(`Reading context '${context.name}' ...`);

		// NOTE: Validate decorator metadata exists before checking TypeScript config
		const meta: unknown = Reflect.getMetadata(CONTEXT_PARAMETER, context) ?? [];
		if (!Array.isArray(meta) || meta.length === 0)
			tracer.bugDetected(context.name, 'No mapping metadata. Apply @mapTo decorator to all constructor parameters.');

		// NOTE: Validate TypeScript emitDecoratorMetadata enabled - required for parameter type reflection
		const paramTypes: unknown = Reflect.getMetadata('design:paramtypes', context) ?? [];
		if (!Array.isArray(paramTypes) || paramTypes.length === 0)
			tracer.bugDetected(context.name, "No type metadata found. Ensure 'emitDecoratorMetadata' is enabled in tsconfig.json.");

		// NOTE: Validate all constructor parameters have @mapTo decorators applied
		if (paramTypes.length !== meta.length)
			tracer.bugDetected(context.name, `Partial metadata mapping: expected ${paramTypes.length}, got ${meta.length}`);

		// NOTE: Extract parameter values in order, undefined returned for missing/failed parameters
		const args = meta.map((key) => this.getNodeParameter(context.name, key as string, functions, tracer));
		const instance = new context(...args);
		instance.throwIfInvalid();
		tracer.info(`Valid context ${context.name} created successfully`);
		return instance;
	}

	/**
	 * Extracts single parameter value from n8n node configuration.
	 *
	 * Returns undefined for missing/optional parameters to support default constructor values.
	 * Uses extractValue option to resolve expressions and extract from complex parameter types.
	 *
	 * @param context - Context class name for logging
	 * @param key - Parameter key to extract (supports dot notation for nested parameters)
	 * @param functions - n8n execution context
	 * @param tracer - Tracer for debug logging
	 * @returns Parameter value or undefined if parameter missing/extraction failed
	 */
	private static getNodeParameter(context: string, key: string, functions: IFunctions, tracer: Tracer): unknown {
		try {
			tracer.debug(`Fetching node parameter '${key}' for context '${context}' ...`);
			// NOTE: extractValue resolves expressions and extracts from collection/fixedCollection parameters
			const value = functions.getNodeParameter(key, 0, undefined, { extractValue: true });
			tracer.debug(`Node parameter '${key}' has been fetched`);
			return value;
		} catch (error) {
			// NOTE: Return undefined for missing parameters - allows constructor defaults to apply
			tracer.debug(`Node parameter '${key}' has not been fetched. Reason: ${(error as Error).message}`);
			return undefined;
		}
	}
}
