import type { IInputValidator } from 'n8n-workflow';
import assert from 'node:assert';

export class InputValidationService {
	private static instance: InputValidationService;

	private inputValidationService: IInputValidator;

	private constructor(inputValidationService: IInputValidator) {
		this.inputValidationService = inputValidationService;
	}

	static async init(inputValidationService: IInputValidator): Promise<void> {
		this.assertSingleInstance();
		InputValidationService.instance = new InputValidationService(inputValidationService);
	}

	private static assertSingleInstance() {
		assert.ok(
			!InputValidationService.instance,
			'Instance already initialized. Multiple initializations are not allowed.',
		);
	}

	async isValid(schemaId: string, body: unknown): Promise<void> {
		return await this.inputValidationService.isValid(schemaId, body);
	}

	private static assertInstance() {
		assert.ok(
			InputValidationService.instance,
			'Instance needs to initialized before use. Make sure to call init()',
		);
	}

	static getInstance(): InputValidationService {
		this.assertInstance();
		return InputValidationService.instance;
	}
}
