import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';

import { SupplyError, SupplyResponseBase } from 'supply/*';
import { Tracer } from 'tracing/*';
import type { IDescriptor, ITraceable } from 'types/*';

/**
 * Abstract base class for intento agents with lifecycle management and tracing.
 *
 * Provides thread-safe initialization, execution orchestration, and comprehensive
 * logging for translation and segmentation agents. Subclasses implement domain-specific
 * initialization and execution logic.
 */
export abstract class AgentBase {
	// NOTE: Promise memoization prevents race conditions when multiple concurrent run() calls trigger initialization
	private initialization: Promise<void> | null = null;
	protected functions: IExecuteFunctions;
	protected tracer: Tracer;
	protected descriptor: IDescriptor;

	/**
	 * Creates agent with descriptor and n8n execution context.
	 *
	 * Protected constructor enforces subclass instantiation. Subclasses must
	 * call super() before implementing domain-specific setup.
	 *
	 * @param descriptor - Agent metadata for logging and identification
	 * @param functions - n8n execution context for node parameter access
	 */
	protected constructor(descriptor: IDescriptor, functions: IExecuteFunctions) {
		this.tracer = new Tracer(functions);
		this.functions = functions;
		this.descriptor = descriptor;
	}

	/**
	 * Executes agent workflow with initialization, execution, and response handling.
	 *
	 * Ensures one-time initialization before execution, traces lifecycle events,
	 * and formats responses for n8n workflow output. Success responses return data,
	 * error responses return error metadata with item index.
	 *
	 * @param signal - Abort signal for cancellation and timeout control
	 * @returns n8n execution data with response or error in workflow format
	 */
	async run(signal: AbortSignal): Promise<INodeExecutionData[][]> {
		this.traceStart();

		await this.ensureInitialized(signal);
		const response = await this.execute(signal);
		this.traceCompletion(response);

		if (response instanceof SupplyResponseBase) return [[{ json: response.asDataObject() }]];

		// NOTE: Error path wraps SupplyError for n8n workflow error display
		const error = { json: { error: response.asDataObject() } };
		const errorOutput = this.functions.helpers.constructExecutionMetaData([error], { itemData: { item: 0 } });
		return [errorOutput];
	}

	/**
	 * Performs one-time agent initialization before execution.
	 *
	 * Called once per agent instance via ensureInitialized(). Use for setup
	 * that should not repeat on subsequent execute() calls (e.g., loading resources,
	 * validating configuration, establishing connections).
	 *
	 * @param signal - Abort signal for cancellation during initialization
	 */
	protected abstract initialize(signal: AbortSignal): Promise<void>;

	/**
	 * Executes agent-specific business logic after initialization.
	 *
	 * Called on every run() invocation after initialization completes. Implement
	 * domain logic (translation, segmentation, etc.) and return success response
	 * or structured error.
	 *
	 * @param signal - Abort signal for cancellation during execution
	 * @returns Success response with results or error with retry/failure details
	 */
	protected abstract execute(signal: AbortSignal): Promise<SupplyResponseBase | SupplyError>;

	private async ensureInitialized(signal: AbortSignal): Promise<void> {
		this.initialization ??= this.initialize(signal);
		await this.initialization;
	}

	private traceStart(): void {
		const props = Object.values(this);
		const toTrace = props.filter((value): value is ITraceable => value !== null && typeof value === 'object' && 'asLogMetadata' in value);
		const meta = toTrace.map((ctx) => ({ type: ctx.constructor.name, ...ctx.asLogMetadata() }));
		const message = `${this.descriptor.symbol} Executing agent...`;
		this.tracer.debug(message, { context: meta });
	}

	private traceCompletion(response: SupplyResponseBase | SupplyError): void {
		if (response instanceof SupplyError) {
			const message = `${this.descriptor.symbol} Agent execution failed`;
			this.tracer.error(message, response.asLogMetadata());
			return;
		}
		const message = `${this.descriptor.symbol} Agent execution succeeded`;
		this.tracer.info(message, response.asLogMetadata());
	}
}
