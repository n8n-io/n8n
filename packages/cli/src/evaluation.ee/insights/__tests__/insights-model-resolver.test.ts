import type {
	CredentialsEntity,
	EvaluationConfig,
	EvaluationConfigRepository,
	User,
} from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';

import { InsightsModelResolver } from '../insights-model-resolver';

const user = mock<User>({ id: 'user-1' });

// Minimal config carrying a single llm_judge metric with the given provider.
function configWithJudge(over: { provider?: string; model?: string; credentialId?: string } = {}) {
	return {
		id: 'cfg-1',
		workflowId: 'wf-1',
		metrics: [
			{
				id: 'm1',
				name: 'Correctness',
				type: 'llm_judge',
				config: {
					preset: 'correctness',
					provider: over.provider ?? '@n8n/n8n-nodes-langchain.lmChatAnthropic',
					credentialId: over.credentialId ?? 'cred-1',
					model: over.model ?? 'claude-sonnet-4-5',
				},
			},
		],
	} as unknown as EvaluationConfig;
}

describe('InsightsModelResolver', () => {
	let evalConfigRepo: Mocked<EvaluationConfigRepository>;
	let credentialsFinder: Mocked<CredentialsFinderService>;
	let credentialsService: Mocked<CredentialsService>;
	let resolver: InsightsModelResolver;

	beforeEach(() => {
		evalConfigRepo = mock<EvaluationConfigRepository>();
		credentialsFinder = mock<CredentialsFinderService>();
		credentialsService = mock<CredentialsService>();
		resolver = new InsightsModelResolver(evalConfigRepo, credentialsFinder, credentialsService);

		credentialsFinder.findCredentialForUser.mockResolvedValue(
			mock<CredentialsEntity>({ id: 'cred-1' }),
		);
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'sk-test', url: 'https://host' });
	});

	it('maps the judge provider to an agents model config with the decrypted key', async () => {
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValueOnce(configWithJudge());

		const result = await resolver.resolve(user, 'wf-1', 'cfg-1');

		expect(result).toEqual({
			modelId: 'anthropic/claude-sonnet-4-5',
			modelConfig: { id: 'anthropic/claude-sonnet-4-5', apiKey: 'sk-test', url: 'https://host' },
		});
	});

	it('does not forward the credential base URL for Google (SDK default has the version path)', async () => {
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValueOnce(
			configWithJudge({
				provider: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
				model: 'gemini-2.5-pro',
			}),
		);
		// Realistic Gemini credential: base URL lives in `host`, no `url`.
		credentialsService.decrypt.mockResolvedValueOnce({
			apiKey: 'sk-test',
			host: 'https://generativelanguage.googleapis.com',
		});

		const result = await resolver.resolve(user, 'wf-1', 'cfg-1');

		// No `url` forwarded — modelConfig carries only id + key (toEqual ignores
		// the undefined `url`), so @ai-sdk/google uses its own …/v1beta default.
		expect(result?.modelConfig).toEqual({ id: 'google/gemini-2.5-pro', apiKey: 'sk-test' });
		expect(result?.modelId).toBe('google/gemini-2.5-pro');
	});

	it('does not forward the credential base URL for Cohere (default omits the /v2 path)', async () => {
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValueOnce(
			configWithJudge({ provider: '@n8n/n8n-nodes-langchain.lmChatCohere', model: 'command-r' }),
		);
		// Cohere's hidden `url` defaults to api.cohere.ai, which the SDK can't use.
		credentialsService.decrypt.mockResolvedValueOnce({
			apiKey: 'sk-test',
			url: 'https://api.cohere.ai',
		});

		const result = await resolver.resolve(user, 'wf-1', 'cfg-1');

		expect(result?.modelConfig).toEqual({ id: 'cohere/command-r', apiKey: 'sk-test' });
		expect(result?.modelId).toBe('cohere/command-r');
	});

	it('checks the credential against the requesting user with credential:read', async () => {
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValueOnce(configWithJudge());

		await resolver.resolve(user, 'wf-1', 'cfg-1');

		expect(credentialsFinder.findCredentialForUser).toHaveBeenCalledWith('cred-1', user, [
			'credential:read',
		]);
	});

	it('returns null when the eval config is missing', async () => {
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValueOnce(null);
		expect(await resolver.resolve(user, 'wf-1', 'cfg-1')).toBeNull();
	});

	it('returns null when there is no llm_judge metric', async () => {
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValueOnce({
			id: 'cfg-1',
			workflowId: 'wf-1',
			metrics: [{ id: 'm1', name: 'Expr', type: 'expression', config: {} }],
		} as unknown as EvaluationConfig);
		expect(await resolver.resolve(user, 'wf-1', 'cfg-1')).toBeNull();
	});

	it('returns null for an unmapped provider (falls back to deterministic)', async () => {
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValueOnce(
			configWithJudge({ provider: '@n8n/n8n-nodes-langchain.lmChatOllama' }),
		);
		expect(await resolver.resolve(user, 'wf-1', 'cfg-1')).toBeNull();
	});

	it('returns null when the credential is inaccessible or has no api key', async () => {
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValue(configWithJudge());

		// User can't read the credential.
		credentialsFinder.findCredentialForUser.mockResolvedValueOnce(null);
		expect(await resolver.resolve(user, 'wf-1', 'cfg-1')).toBeNull();

		// Readable but no api key in the decrypted data.
		credentialsFinder.findCredentialForUser.mockResolvedValueOnce(
			mock<CredentialsEntity>({ id: 'cred-1' }),
		);
		credentialsService.decrypt.mockResolvedValueOnce({ url: 'https://host' });
		expect(await resolver.resolve(user, 'wf-1', 'cfg-1')).toBeNull();
	});
});
