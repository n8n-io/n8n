import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { listBedrockInferenceProfiles } from '../listBedrockInferenceProfiles';

describe('listBedrockInferenceProfiles', () => {
	const systemProfile = {
		inferenceProfileId: 'eu.anthropic.claude-sonnet-4-6-v1:0',
		inferenceProfileName: 'EU Anthropic Claude Sonnet 4.6',
		inferenceProfileArn:
			'arn:aws:bedrock:eu-central-1:123456789012:inference-profile/eu.anthropic.claude-sonnet-4-6-v1:0',
	};
	const applicationProfile = {
		inferenceProfileId: 'kqtghn90uu4g',
		inferenceProfileName: 'Cost Centre Claude',
		inferenceProfileArn:
			'arn:aws:bedrock:eu-central-1:123456789012:application-inference-profile/kqtghn90uu4g',
	};

	const httpMockFor = (
		system: Promise<unknown> | unknown,
		application: Promise<unknown> | unknown,
	) =>
		vi.fn().mockImplementation(async (_credentialsType: string, options: { url: string }) => {
			return options.url.includes('type=APPLICATION') ? await application : await system;
		});

	const contextFor = (httpMock: ReturnType<typeof vi.fn>) =>
		({
			helpers: { httpRequestWithAuthentication: httpMock },
			logger: { warn: vi.fn() },
		}) as unknown as ILoadOptionsFunctions;

	const baseURL = 'https://bedrock.eu-central-1.amazonaws.com';
	const api = { credentialsType: 'aws', baseURL } as const;

	it('merges system-defined and application profiles from both requests', async () => {
		const httpMock = httpMockFor(
			{ inferenceProfileSummaries: [systemProfile] },
			{ inferenceProfileSummaries: [applicationProfile] },
		);
		const ctx = contextFor(httpMock);

		const profiles = await listBedrockInferenceProfiles(ctx, api);

		expect(profiles).toEqual([systemProfile, applicationProfile]);
		expect(httpMock).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({ baseURL, url: '/inference-profiles?maxResults=1000' }),
		);
		expect(httpMock).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				baseURL,
				url: '/inference-profiles?maxResults=1000&type=APPLICATION',
			}),
		);
	});

	it('returns application profiles and warns when the system-defined request fails', async () => {
		const failure = new Error('AccessDenied');
		const httpMock = httpMockFor(Promise.reject(failure), {
			inferenceProfileSummaries: [applicationProfile],
		});
		const ctx = contextFor(httpMock);

		const profiles = await listBedrockInferenceProfiles(ctx, api);

		expect(profiles).toEqual([applicationProfile]);
		expect(ctx.logger.warn).toHaveBeenCalledWith(
			'Bedrock model listing: inference-profiles request failed',
			{ error: failure, profileType: 'SYSTEM_DEFINED' },
		);
	});

	it('returns system-defined profiles and warns when the application request fails', async () => {
		const failure = new Error('AccessDenied');
		const httpMock = httpMockFor(
			{ inferenceProfileSummaries: [systemProfile] },
			Promise.reject(failure),
		);
		const ctx = contextFor(httpMock);

		const profiles = await listBedrockInferenceProfiles(ctx, api);

		expect(profiles).toEqual([systemProfile]);
		expect(ctx.logger.warn).toHaveBeenCalledWith(
			'Bedrock model listing: inference-profiles request failed',
			{ error: failure, profileType: 'APPLICATION' },
		);
	});

	it('throws the system-defined failure when both requests fail, logging both reasons', async () => {
		const systemFailure = new Error('AccessDenied');
		const applicationFailure = new Error('Throttled');
		const httpMock = httpMockFor(Promise.reject(systemFailure), Promise.reject(applicationFailure));
		const ctx = contextFor(httpMock);

		await expect(listBedrockInferenceProfiles(ctx, api)).rejects.toThrow('AccessDenied');
		expect(ctx.logger.warn).toHaveBeenCalledWith(
			'Bedrock model listing: inference-profiles request failed',
			{ error: systemFailure, profileType: 'SYSTEM_DEFINED' },
		);
		expect(ctx.logger.warn).toHaveBeenCalledWith(
			'Bedrock model listing: inference-profiles request failed',
			{ error: applicationFailure, profileType: 'APPLICATION' },
		);
	});

	it('dedupes profiles returned by both requests', async () => {
		const httpMock = httpMockFor(
			{ inferenceProfileSummaries: [systemProfile, applicationProfile] },
			{ inferenceProfileSummaries: [applicationProfile] },
		);
		const ctx = contextFor(httpMock);

		const profiles = await listBedrockInferenceProfiles(ctx, api);

		expect(profiles).toEqual([systemProfile, applicationProfile]);
	});

	it('tolerates responses without inferenceProfileSummaries', async () => {
		const httpMock = httpMockFor({}, {});
		const ctx = contextFor(httpMock);

		await expect(listBedrockInferenceProfiles(ctx, api)).resolves.toEqual([]);
	});
});
