import { type ISupplyDataFunctions, type NodeConnectionType } from 'n8n-workflow';

import { TranslationError } from '../types/TranslationError';
import type { TranslationRequest } from '../types/TranslationRequest';
import type { TranslationResponse } from '../types/TranslationResponse';
import { TranslationSupplier } from '../types/TranslationSupplier';

export class DryRunTranslationSupplier extends TranslationSupplier {
	private result: 'pass' | 'overwrite' | 'fail' = 'pass';
	private translation: string = '';
	private statusCode: number = 500;
	private errorMessage: string = '';

	private delay: boolean = false;
	private delayType: 'fixed' | 'random' = 'fixed';
	private delayValue: number = 0;

	constructor(connection: NodeConnectionType, data: ISupplyDataFunctions) {
		super(connection, data);
		const parameters = data.getNode().parameters;

		this.result = parameters.mockedTranslationResult as 'pass' | 'overwrite' | 'fail';
		this.translation = parameters.mockedTranslationText as string;
		this.statusCode = parameters.mockedTranslationStatusCode as number;
		this.errorMessage = parameters.mockedTranslationErrorMessage as string;

		this.delay = parameters.delayEnabled as boolean;
		this.delayType = parameters.delayType as 'fixed' | 'random';
		this.delayValue = parameters.delayValue as number;
	}

	protected override async executeTranslation(
		request: TranslationRequest,
	): Promise<TranslationResponse> {
		const startTime = Date.now();

		// Apply delay if configured
		if (this.delay) {
			const delay = this.delayType === 'random' ? Math.random() * this.delayValue : this.delayValue;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		// Handle fail case - permanent failure
		if (this.result === 'fail') {
			throw TranslationError.fromLocal(this.statusCode, this.errorMessage, Date.now() - startTime);
		}

		// Build response for pass or overwrite case
		const translation = this.result === 'overwrite' ? this.translation : request.text;
		const response: TranslationResponse = {
			text: request.text,
			from: request.from,
			to: request.to,
			translation,
			detectedLanguage: request.from,
			latency: Date.now() - startTime,
		};

		return response;
	}
}
