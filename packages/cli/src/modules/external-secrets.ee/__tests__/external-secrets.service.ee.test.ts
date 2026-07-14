import type { IDataObject } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExternalSecretsManager } from '../external-secrets-manager.ee.js';
import { ExternalSecretsService } from '../external-secrets.service.ee.js';
import type { RedactionService } from '../redaction.service.ee.js';
import type { SecretsProvider } from '../types.js';

describe('ExternalSecretsService', () => {
	let service: ExternalSecretsService;
	let provider: SecretsProvider;
	let mockRedactionService: RedactionService;

	beforeEach(() => {
		mockRedactionService = mock<RedactionService>();
		service = new ExternalSecretsService(mock<ExternalSecretsManager>(), mockRedactionService);
		provider = mock<SecretsProvider>();
	});

	describe('redact', () => {
		it('should delegate to RedactionService with provider properties', () => {
			const data: IDataObject = { secret: 'password' };
			const redactedData: IDataObject = { secret: '__n8n_BLANK_VALUE_' };
			provider.properties = [
				{
					name: 'secret',
					type: 'string',
					displayName: 'Secret',
					default: '',
					typeOptions: { password: true },
				},
			];

			mockRedactionService.redact = vi.fn().mockReturnValue(redactedData);

			const result = service.redact(data, provider);

			expect(mockRedactionService.redact).toHaveBeenCalledWith(data, provider.properties);
			expect(result).toBe(redactedData);
		});
	});

	describe('unredact', () => {
		it('should delegate to RedactionService', () => {
			const redactedData: IDataObject = { secret: '__n8n_BLANK_VALUE_' };
			const savedData: IDataObject = { secret: 'password' };
			const unredactedData: IDataObject = { secret: 'password' };

			mockRedactionService.unredact = vi.fn().mockReturnValue(unredactedData);

			const result = service.unredact(redactedData, savedData);

			expect(mockRedactionService.unredact).toHaveBeenCalledWith(redactedData, savedData);
			expect(result).toBe(unredactedData);
		});
	});
});
