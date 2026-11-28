import type { INodeProperties } from 'n8n-workflow';

import { fillManagedPlaceholders } from '../managed-credential';

describe('managed credential (spike)', () => {
	describe('fillManagedPlaceholders', () => {
		const property = (p: Partial<INodeProperties>): INodeProperties =>
			({ displayName: p.name, type: 'string', default: '', ...p }) as INodeProperties;

		it('uses the default, then the UI example, then a placeholder', () => {
			const filled = fillManagedPlaceholders([
				property({ name: 'graphApiBaseUrl', default: 'https://graph.microsoft.com' }),
				property({ name: 'domain', placeholder: 'https://example.atlassian.net' }),
				property({ name: 'subdomain' }),
				property({ name: 'apiKey' }),
				property({ name: 'note', type: 'notice' }),
			]);
			expect(filled).toEqual({
				graphApiBaseUrl: 'https://graph.microsoft.com',
				domain: 'https://example.atlassian.net',
				subdomain: 'managed',
				apiKey: 'managed',
				note: '',
			});
		});

		it('leaves secret fields empty, so no stand-in secret leaves n8n', () => {
			const filled = fillManagedPlaceholders([
				property({ name: 'accessToken', typeOptions: { password: true } }),
			]);
			expect(filled).toEqual({ accessToken: '' });
		});
	});
});
