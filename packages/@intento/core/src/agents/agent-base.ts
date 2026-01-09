import type { INodeExecutionData } from 'n8n-workflow';

import type { SupplyError } from 'supply/*';
import { SupplyResponse } from 'supply/*';
import { Tracer } from 'tracing/*';
import type { IFunctions } from 'types/*';

export abstract class AgentBase {
	private initialized = false;
	protected functions: IFunctions;
	protected tracer: Tracer;

	protected constructor(functions: IFunctions) {
		this.tracer = new Tracer(functions);
		this.functions = functions;
	}

	async run(signal: AbortSignal): Promise<INodeExecutionData[][]> {
		let response: SupplyResponse | SupplyError | INodeExecutionData[];
		this.tracer.debug('🤖 Executing Agent node...');
		try {
			await this.ensureInitialized(signal);
			response = await this.execute(signal);
			if (response instanceof SupplyResponse) {
				this.tracer.debug('🤖 Agent execution succeeded', response.asLogMetadata());
				return [[{ json: response.asDataObject() }]];
			}
		} catch (error) {
			response = this.onError(error as Error);
			this.tracer.error('🤖 Agent execution failed', { source: error });
			const errorOutput = this.functions.helpers.constructExecutionMetaData(response, { itemData: { item: 0 } });
			return [errorOutput];
		}
		this.tracer.error('🤖 Agent execution failed', response.asLogMetadata());
		const error = { json: { error: response.asDataObject() } };
		const errorOutput = this.functions.helpers.constructExecutionMetaData([error], { itemData: { item: 0 } });
		return [errorOutput];
	}

	protected abstract initialize(signal: AbortSignal): Promise<void>;

	protected abstract execute(signal: AbortSignal): Promise<SupplyResponse | SupplyError>;

	protected onError(error: Error): INodeExecutionData[] {
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			const reason = `⏰ [Timeout] Agent '${this.constructor.name}' reached the execution timed out. Please consider increasing the node timeout limit.`;
			this.tracer.warn(reason, { source: error });
			return [{ json: { error: reason } }];
		}
		if (error instanceof DOMException && error.name === 'AbortError') {
			const reason = `⏰ [Abort] Agent '${this.constructor.name}' was not able to complete the execution before the abort.`;
			this.tracer.warn(reason, { source: error });
			return [{ json: { error: reason } }];
		}
		const reason = `🐞 [Bug] Agent '${this.constructor.name}' encountered an unexpected error: ${error.message}`;
		this.tracer.error(reason, { source: error });
		return [{ json: { error: reason } }];
	}

	private async ensureInitialized(signal: AbortSignal): Promise<void> {
		if (!this.initialized) {
			await this.initialize(signal);
			this.initialized = true;
		}
	}
}
