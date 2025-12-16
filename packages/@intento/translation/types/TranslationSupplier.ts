import {
	ExecutionError,
	NodeOperationError,
	type ISupplyDataFunctions,
	type NodeConnectionType,
} from 'n8n-workflow';

import type { TranslationRequest } from './TranslationRequest';
import type { TranslationResponse } from './TranslationResponse';

export abstract class TranslationSupplier {
	private supplyData: ISupplyDataFunctions;
	private connection: NodeConnectionType;
	private retryEnabled: boolean = false;
	private retryMaxAttempts: number = 1;
	private retryMaxDelay: number = 1000;

	constructor(connection: NodeConnectionType, data: ISupplyDataFunctions) {
		this.supplyData = data;
		this.connection = connection;

		const parameters = data.getNode().parameters;
		this.retryEnabled = parameters?.retryEnabled as boolean;
		this.retryMaxAttempts = parameters?.retryMaxAttempts as number;
		this.retryMaxDelay = parameters?.retryMaxDelay as number;
	}

	protected abstract executeTranslation(request: TranslationRequest): Promise<TranslationResponse>;

	async translate(request: TranslationRequest): Promise<TranslationResponse> {
		const condition = this.retryEnabled ? this.retryMaxAttempts : 1;
		for (let i = 0; i < condition; i++) {
			try {
				if (i > 0) await this.waitTillNextRetryAttempt(i);
				this.supplyData.addInputData(this.connection, [[{ json: request }]], i);
				const response = await this.executeTranslation(request);
				this.supplyData.addOutputData(this.connection, i, [[{ json: response }]]);
				return response;
			} catch (error) {
				const nodeError = new NodeOperationError(this.supplyData.getNode(), error as Error);
				this.supplyData.addOutputData(this.connection, i, nodeError as ExecutionError);
			}
		}

		throw new NodeOperationError(
			this.supplyData.getNode(),
			`Translation failed after maximum retry attempts: ${this.retryMaxAttempts}`,
		);
	}

	async waitTillNextRetryAttempt(attempt: number): Promise<void> {
		const baseDelay = this.retryMaxDelay / (2 ^ this.retryMaxAttempts);
		const rawDelay = baseDelay * (2 ^ attempt);
		const jitter = Math.random() * rawDelay * 0.2;
		const delay = rawDelay - jitter;
		return await new Promise((resolve) => setTimeout(resolve, delay));
	}
}
