import type { OutboundHttp } from '@n8n/backend-network';
import type { Logger } from '@n8n/backend-common';
import { OperationalError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { VaultCredentialResolver } from '../vault-credential-resolver';
import { VaultCredentialsConfig } from '../vault-credentials.config';
import type {
	VaultWorkflowDefinitionService,
	WorkflowDefinitions,
} from '../vault-workflow-definition.service';

describe('VaultCredentialResolver', () => {
	const request = vi.fn();
	const outboundHttp = mock<OutboundHttp>();
	const definitions = mock<VaultWorkflowDefinitionService>();
	const draftNodes = [{ name: 'Charge', parameters: { url: 'https://draft.test' } }];
	const publishedNodes = [{ name: 'Charge', parameters: { url: 'https://published.test' } }];
	const workflow: WorkflowDefinitions = {
		workflowId: 'wf1',
		draftVersionId: 'draft-1',
		activeVersionId: 'active-1',
		draft: { nodes: draftNodes as never, connections: {} },
		active: { nodes: publishedNodes as never, connections: {} },
	};

	const config = Object.assign(new VaultCredentialsConfig(), {
		brokerUrl: 'http://broker.test:8787',
		vaultUrl: 'http://vault.test:8200',
	});

	const input = {
		credentialId: 'cred1',
		data: { $vault: 'kv/creds/cred1' },
		workflowId: 'wf1',
		executionId: 'exec1',
		mode: 'webhook' as const,
	};

	const logger = mock<Logger>();
	let resolver: VaultCredentialResolver;

	beforeEach(() => {
		vi.resetAllMocks();
		outboundHttp.requests.mockReturnValue({ request } as never);
		definitions.load.mockResolvedValue(workflow);
		logger.scoped.mockReturnValue(logger);
		resolver = new VaultCredentialResolver(config, outboundHttp, definitions, logger);
	});

	describe('isVaultReference', () => {
		it('accepts data that holds a vault reference', () => {
			expect(resolver.isVaultReference({ $vault: 'kv/creds/cred1' })).toBe(true);
		});

		it('rejects ordinary credential data', () => {
			expect(resolver.isVaultReference({ apiKey: 'abc' })).toBe(false);
			expect(resolver.isVaultReference({ $vault: 42 })).toBe(false);
		});
	});

	describe('steps', () => {
		it('reports each step without any secret value, envelope or key', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: { wrapToken: 'wrap-1' } })
				.mockResolvedValueOnce({
					statusCode: 200,
					body: { data: { data: { value: JSON.stringify({ accessToken: 'sk_live_real' }) } } },
				});
			const onStep = vi.fn();

			await resolver.resolve({
				...input,
				data: { $vault: 'kv/creds/cred1', url: 'https://api.test' },
				credentialName: 'GitHub account',
				nodeName: 'GitHub',
				onStep,
			});

			const text = onStep.mock.calls.map(([line]) => String(line)).join('\n');
			expect(onStep).toHaveBeenCalledTimes(3);
			expect(text).toContain('node "GitHub" needs credential "GitHub account"');
			expect(text).toContain('accessToken');
			expect(text).toContain('url');
			expect(text).not.toContain('sk_live_real');
			expect(text).not.toContain('wrap-1');
			expect(JSON.stringify(logger.info.mock.calls)).not.toContain('sk_live_real');
			expect(JSON.stringify(logger.info.mock.calls)).not.toContain('wrap-1');
		});

		it('says which version the broker is shown for a manual run', async () => {
			request.mockResolvedValueOnce({ statusCode: 403, body: { reason: 'nope' } });
			const onStep = vi.fn();

			await expect(resolver.resolve({ ...input, mode: 'manual', onStep })).rejects.toThrow(
				UserError,
			);

			expect(String(onStep.mock.calls[0][0])).toContain('saved draft');
			expect(String(onStep.mock.calls[1][0])).toContain('stopped');
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('resolve', () => {
		it('returns the credential data from the vault', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: { wrapToken: 'wrap-1' } })
				.mockResolvedValueOnce({
					statusCode: 200,
					body: { data: { data: { value: JSON.stringify({ apiKey: 'sk_live_real' }) } } },
				});

			await expect(resolver.resolve(input)).resolves.toEqual({ apiKey: 'sk_live_real' });
		});

		it('keeps the fields n8n stores and lets the vault fill the secret fields', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: { wrapToken: 'wrap-1' } })
				.mockResolvedValueOnce({
					statusCode: 200,
					body: { data: { data: { value: JSON.stringify({ accessToken: 'xoxb-real' }) } } },
				});

			await expect(
				resolver.resolve({
					...input,
					data: { $vault: 'kv/creds/cred1', url: 'https://slack.com', accessToken: 'stale' },
				}),
			).resolves.toEqual({ url: 'https://slack.com', accessToken: 'xoxb-real' });
		});

		it('sends the workflow definition to the broker and unwraps at the configured vault', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: { wrapToken: 'wrap-1' } })
				.mockResolvedValueOnce({
					statusCode: 200,
					body: { data: { data: { value: '{}' } } },
				});

			await resolver.resolve(input);

			expect(request).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					url: 'http://broker.test:8787/token',
					body: {
						workflowId: 'wf1',
						executionId: 'exec1',
						credentialId: 'cred1',
						workflow: { nodes: publishedNodes, connections: {} },
					},
				}),
			);
			expect(request).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: 'http://vault.test:8200/v1/sys/wrapping/unwrap',
					headers: { 'x-vault-token': 'wrap-1' },
				}),
			);
		});

		describe('which workflow version is checked', () => {
			const grantedBody = { statusCode: 200, body: { wrapToken: 'wrap-1' } };
			const secretBody = { statusCode: 200, body: { data: { data: { value: '{}' } } } };

			const sentNodes = () => request.mock.calls[0][0].body.workflow.nodes;

			beforeEach(() => {
				request.mockResolvedValueOnce(grantedBody).mockResolvedValueOnce(secretBody);
			});

			it('checks the published version for a production run', async () => {
				await resolver.resolve({ ...input, mode: 'trigger' });

				expect(sentNodes()).toEqual(publishedNodes);
			});

			it('checks the saved draft for a manual run', async () => {
				await resolver.resolve({ ...input, mode: 'manual' });

				expect(sentNodes()).toEqual(draftNodes);
			});

			it('falls back to the draft when the workflow has no published version', async () => {
				definitions.load.mockResolvedValue({ ...workflow, activeVersionId: null, active: null });

				await resolver.resolve(input);

				expect(sentNodes()).toEqual(draftNodes);
			});
		});

		it('stops the run when the broker refuses', async () => {
			request.mockResolvedValueOnce({
				statusCode: 403,
				body: { reason: 'workflow hash does not match the grant' },
			});

			const result = resolver.resolve(input);

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow(
				'The vault refused access to this credential: workflow hash does not match the grant',
			);
			expect(request).toHaveBeenCalledTimes(1);
		});

		it('says when the credential has no secret in the vault yet', async () => {
			request.mockResolvedValueOnce({
				statusCode: 404,
				body: { reason: 'no secret has been entered for this credential' },
			});

			const result = resolver.resolve(input);

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow('has no secret in the vault yet');
		});

		it('stops the run when the broker cannot be reached', async () => {
			request.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

			await expect(resolver.resolve(input)).rejects.toThrow(OperationalError);
		});

		it('stops the run when the vault returns no value', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: { wrapToken: 'wrap-1' } })
				.mockResolvedValueOnce({ statusCode: 400, body: {} });

			await expect(resolver.resolve(input)).rejects.toThrow(OperationalError);
		});

		it('refuses a reference that points at another credential', async () => {
			await expect(
				resolver.resolve({ ...input, data: { $vault: 'kv/creds/cred2' } }),
			).rejects.toThrow(UserError);
			expect(request).not.toHaveBeenCalled();
		});

		it('refuses to run without a workflow run', async () => {
			await expect(resolver.resolve({ ...input, executionId: undefined })).rejects.toThrow(
				UserError,
			);
			await expect(resolver.resolve({ ...input, workflowId: undefined })).rejects.toThrow(
				UserError,
			);
			expect(request).not.toHaveBeenCalled();
		});

		it('refuses when the workflow no longer exists', async () => {
			definitions.load.mockResolvedValue(null);

			await expect(resolver.resolve(input)).rejects.toThrow(UserError);
			expect(request).not.toHaveBeenCalled();
		});

		it('refuses when no vault is configured', async () => {
			const unconfigured = new VaultCredentialResolver(
				new VaultCredentialsConfig(),
				outboundHttp,
				definitions,
				logger,
			);

			await expect(unconfigured.resolve(input)).rejects.toThrow(UserError);
			expect(request).not.toHaveBeenCalled();
		});
	});
});
