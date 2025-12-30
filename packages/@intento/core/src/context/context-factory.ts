import 'reflect-metadata';

import type { Tracer } from 'tracing/*';
import type { IContext, IFunctions } from 'types/*';
import { CoreError } from 'types/*';

/**
 * Metadata key for storing parameter mapping information on constructor prototypes.
 * Used by @mapTo decorator to map n8n node parameters to constructor arguments.
 *
 * This symbol ensures the metadata doesn't collide with other reflection metadata.
 * The decorator stores an array of parameter keys (strings) that preserve the
 * left-to-right constructor parameter order after decorator execution reversal.
 */
export const CONTEXT_PARAMETER = Symbol('intento:context_parameter');

/**
 * Error messages for ContextFactory validation failures.
 *
 * All errors prefixed with 🐞 [BUG] indicate developer errors that should be caught during development,
 * not production runtime issues. These represent incorrect decorator usage or configuration.
 *
 * These errors are unrecoverable - they indicate the code needs to be fixed, not runtime conditions
 * to be handled. They will fail n8n node execution immediately.
 */
const ERROR = {
	wrongDecoratorUsage: (where: string) => `🐞 [BUG] at '${where}'. The @mapTo decorator can only be applied to constructor parameters.`,
	noMetadataFound: (where: string) => `🐞 [BUG] at '${where}'. No mapping metadata. Apply @mapTo decorator to all constructor parameters.`,
	noTypesFound: (where: string) =>
		`🐞 [BUG] at '${where}'. No type metadata found. Ensure 'emitDecoratorMetadata' is enabled in tsconfig.json.`,
	partialMetadataMapping: (where: string, x: number, y: number) =>
		`🐞 [BUG] at '${where}'. Only ${x} of ${y} parameters mapped with @mapTo decorator. Apply @mapTo decorator to all constructor parameters.`,
	invalidContext: (where: string, reason: string) =>
		`🐞 [BUG] at '${where}'. Created context is invalid: ${reason}. Ensure the n8n node definition follow the validation rules.`,
};

/**
 * Decorator that maps constructor parameters to n8n node properties.
 *
 * Enables automatic parameter extraction from n8n node definitions without manual
 * configuration. All constructor parameters must be decorated for ContextFactory to work.
 *
 * **Decorator Execution Order:**
 * Decorators execute bottom-to-top (right-to-left for parameters), but parameter order
 * must be preserved left-to-right for constructor calls. This decorator handles the
 * reversal internally by prepending to the metadata array, so the final metadata
 * array matches the original parameter order.
 *
 * **Metadata Accumulation:**
 * Each decorator invocation retrieves existing metadata and adds its key at the front,
 * building up the complete parameter mapping across all decorators. The final array
 * stored on the constructor prototype contains all parameter keys in correct order.
 *
 * @param key - Node parameter name to extract from n8n node definition (e.g., 'apiKey', 'timeout')
 * @param collection - Optional parent collection for nested parameters. Uses dot notation
 *                     to navigate n8n node parameter structure (e.g., 'options' → 'options.timeout')
 * @returns ParameterDecorator that stores mapping metadata on constructor prototype
 * @throws CoreError if decorator applied to non-constructor parameter or metadata corrupted
 *
 * @example
 * ```typescript
 * class MyContext {
 *   constructor(
 *     @mapTo('apiKey') apiKey: string,
 *     @mapTo('timeout', 'options') timeout: number // Extracts 'options.timeout'
 *   ) { ... }
 * }
 * // Metadata stored: ['apiKey', 'options.timeout']
 * ```
 */
export function mapTo(key: string, collection?: string): ParameterDecorator {
	return function (target: object, _propertyKey: string | symbol | undefined, _parameterIndex: number) {
		// NOTE: Retrieve existing metadata from constructor prototype (accumulates across all parameters)
		const existing: unknown = Reflect.getMetadata(CONTEXT_PARAMETER, target) ?? [];
		if (!Array.isArray(existing)) throw new CoreError(ERROR.wrongDecoratorUsage(target.constructor.name));
		// NOTE: Decorators execute bottom-to-top, so we prepend to maintain left-to-right parameter order
		const meta = [collection ? `${collection}.${key}` : key, ...(existing as string[])];
		Reflect.defineMetadata(CONTEXT_PARAMETER, meta, target);
	};
}

/**
 * Factory for creating validated context instances from n8n node parameters.
 *
 * Uses @mapTo decorator metadata to extract parameters and validates both decorator
 * coverage and business rules before returning instances. Follows a fail-fast approach
 * to catch developer mistakes during development rather than allowing silent failures
 * or partial object creation at runtime.
 *
 * **Validation Strategy:**
 * 1. Validate decorator coverage (all parameters must have @mapTo)
 * 2. Extract parameters in correct order from n8n node definition
 * 3. Construct context instance
 * 4. Validate business rules via context's throwIfInvalid() method
 *
 * **Performance:** O(n) where n = parameter count. Metadata validation happens before
 * parameter extraction to avoid wasted work if configuration is invalid.
 *
 * **Error Philosophy:** All errors thrown are unrecoverable developer errors (indicated
 * by 🐞 [BUG] prefix), not runtime conditions to handle gracefully.
 */
export class ContextFactory {
	/**
	 * Creates and validates context instance from n8n node parameters.
	 *
	 * **Validation Flow:**
	 * 1. Check decorator coverage: all parameters must have @mapTo metadata
	 * 2. Verify TypeScript emit metadata: requires 'emitDecoratorMetadata: true' in tsconfig
	 * 3. Extract parameters from n8n node definition in correct order
	 * 4. Construct context instance with extracted parameters
	 * 5. Validate business rules via context.throwIfInvalid()
	 *
	 * Fails fast on configuration errors (steps 1-2) before attempting parameter extraction
	 * to avoid partial object creation. All constructor parameters must be decorated with
	 * @mapTo for this method to work correctly.
	 *
	 * @param context - Context class constructor with all parameters decorated via @mapTo.
	 *                  Each parameter must have exactly one @mapTo decorator.
	 * @param functions - n8n functions for parameter extraction. Provides getNodeParameter()
	 *                    method that resolves expressions and references in node definitions.
	 * @param tracer - Tracer for debug logging and error handling. All CoreErrors are logged
	 *                 before being thrown.
	 * @returns Validated context instance with all required parameters extracted and business
	 *          rules validated
	 * @throws CoreError if decorator coverage incomplete, metadata missing, or validation fails.
	 *                   All errors indicate developer configuration issues, not runtime problems.
	 */
	// NOTE: any[] required here because TypeScript can't express spreading unknown[] into arbitrary constructor signatures
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	static read<T extends IContext>(context: new (...args: any[]) => T, functions: IFunctions, tracer: Tracer): T {
		tracer.debug(`🔮 Reading context '${context.name}' ...`);

		// NOTE: Validate decorator coverage before attempting parameter extraction to fail fast
		const meta: unknown = Reflect.getMetadata(CONTEXT_PARAMETER, context) ?? [];
		if (!Array.isArray(meta) || meta.length === 0) tracer.errorAndThrow(ERROR.noMetadataFound(context.name));
		// NOTE: 'design:paramtypes' metadata requires 'emitDecoratorMetadata: true' in tsconfig.json
		const paramTypes: unknown = Reflect.getMetadata('design:paramtypes', context) ?? [];
		if (!Array.isArray(paramTypes) || paramTypes.length === 0) tracer.errorAndThrow(ERROR.noTypesFound(context.name));
		// NOTE: All parameters must be decorated - partial coverage indicates developer error
		if (paramTypes.length !== meta.length) tracer.errorAndThrow(ERROR.partialMetadataMapping(context.name, meta.length, paramTypes.length));

		// NOTE: Extract parameters in left-to-right order (already corrected for decorator bottom-to-top execution)
		const args = meta.map((key) => this.getNodeParameter(context.name, key as string, functions, tracer));
		const instance = new context(...args);
		// NOTE: Validate business rules after construction - catches invalid parameter combinations
		this.throwIfInvalid(instance, tracer);
		tracer.debug(`🔮 Valid context ${context.name} created successfully`);
		return instance;
	}

	/**
	 * Extracts parameter value from n8n node definition with error recovery.
	 *
	 * Returns undefined if parameter not found in node definition rather than throwing,
	 * allowing optional parameters and delegating validation to context's throwIfInvalid.
	 * This separation of concerns allows contexts to distinguish between "parameter not
	 * provided" vs "parameter provided with invalid value".
	 *
	 * **Parameter Resolution:**
	 * Uses functions.getNodeParameter() with extractValue: true to resolve:
	 * - Expression strings (e.g., '={{ $json.field }}')
	 * - Node references and workflow variables
	 * - Static values from node definition
	 *
	 * Supports dot notation for nested parameters (e.g., 'options.timeout' accesses the
	 * 'timeout' property within the 'options' collection).
	 *
	 * @param context - Context class name for error messages and debug logging
	 * @param key - Node parameter key. Supports dot notation for nested parameters
	 *              (e.g., 'apiKey', 'options.timeout', 'auth.credentials.token')
	 * @param functions - n8n functions providing getNodeParameter() method with expression
	 *                    resolution capabilities
	 * @param tracer - Tracer for debug logging parameter fetch attempts and failures
	 * @returns Parameter value (any type) or undefined if parameter not found in node definition
	 */
	private static getNodeParameter(context: string, key: string, functions: IFunctions, tracer: Tracer): unknown {
		try {
			tracer.debug(`🔮 Fetching node parameter '${key}' for context '${context}' ...`);
			// NOTE: extractValue: true resolves expressions and references to actual values
			const value = functions.getNodeParameter(key, 0, undefined, { extractValue: true });
			tracer.debug(`🔮 Node parameter '${key}' has been fetched`);
			return value;
		} catch (error) {
			// NOTE: Return undefined for missing parameters - context validation will handle required checks
			tracer.debug(`🔮 Node parameter '${key}' has not been fetched. Reason: ${(error as Error).message}`);
			return undefined;
		}
	}

	/**
	 * Validates context instance business rules and wraps validation errors with rich context.
	 *
	 * Delegates to context's throwIfInvalid() for business rule validation, then enriches
	 * any validation errors with context metadata for better debugging. This two-phase
	 * approach separates:
	 * - Context validation logic (in context.throwIfInvalid())
	 * - Error enrichment and logging (in this method)
	 *
	 * **Error Enrichment:**
	 * Catches validation errors and wraps them with:
	 * - Context class name
	 * - Context instance metadata (from asLogMetadata())
	 * - Original error as childError for stack trace preservation
	 *
	 * This enriched metadata helps developers debug validation failures by providing
	 * the complete context state that triggered the error.
	 *
	 * @param instance - Context instance to validate (already constructed with extracted parameters)
	 * @param tracer - Tracer for error logging and throwing. Logs enriched error before throwing.
	 * @throws CoreError with enriched metadata if validation fails. Contains original error
	 *                   as childError and context state as metadata.
	 */
	private static throwIfInvalid(instance: IContext, tracer: Tracer): void {
		try {
			instance.throwIfInvalid();
		} catch (error) {
			// NOTE: Enrich validation error with context metadata for debugging
			const reason = (error as Error).message;
			const meta = {
				context: {
					name: instance.constructor.name,
					...instance.asLogMetadata(),
				},
				childError: error as Error,
			};
			tracer.errorAndThrow(ERROR.invalidContext(instance.constructor.name, reason), meta);
		}
	}
}
