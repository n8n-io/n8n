import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

jest.mock('../helpers/model', () => ({
	createLLMCheckFn: jest.fn(() => jest.fn()),
}));

jest.mock('../actions/checks/jailbreak', () => ({
	createJailbreakCheckFn: jest.fn(() => jest.fn()),
	JAILBREAK_PROMPT: 'DEFAULT_JAILBREAK',
}));

jest.mock('../actions/checks/keywords', () => ({
	createKeywordsCheckFn: jest.fn(() => jest.fn()),
}));

jest.mock('../actions/checks/nsfw', () => ({
	createNSFWCheckFn: jest.fn(() => jest.fn()),
	NSFW_SYSTEM_PROMPT: 'DEFAULT_NSFW',
}));

jest.mock('../actions/checks/pii', () => ({
	createPiiCheckFn: jest.fn(() => jest.fn()),
	createCustomRegexCheckFn: jest.fn(() => jest.fn()),
}));

jest.mock('../actions/checks/secretKeys', () => ({
	createSecretKeysCheckFn: jest.fn(() => jest.fn()),
}));

jest.mock('../actions/checks/topicalAlignment', () => ({
	createTopicalAlignmentCheckFn: jest.fn(() => jest.fn()),
	TOPICAL_ALIGNMENT_SYSTEM_PROMPT: 'DEFAULT_TOPICAL',
}));

jest.mock('../actions/checks/urls', () => ({
	createUrlsCheckFn: jest.fn(() => jest.fn()),
}));

import { createJailbreakCheckFn } from '../actions/checks/jailbreak';
import { createKeywordsCheckFn } from '../actions/checks/keywords';
import { createNSFWCheckFn } from '../actions/checks/nsfw';
import { createCustomRegexCheckFn, createPiiCheckFn } from '../actions/checks/pii';
import { createSecretKeysCheckFn } from '../actions/checks/secretKeys';
import { createTopicalAlignmentCheckFn } from '../actions/checks/topicalAlignment';
import { createUrlsCheckFn } from '../actions/checks/urls';
import { process as processGuardrails } from '../actions/process';
import { createLLMCheckFn } from '../helpers/model';

describe('Guardrails Process', () => {
	let exec: jest.Mocked<IExecuteFunctions>;
	let node: INode;

	beforeEach(() => {
		jest.clearAllMocks();
		exec = mockDeep<IExecuteFunctions>();
		node = {
			id: 'test',
			name: 'Guardrails',
			type: 'n8n-nodes-langchain.guardrails',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		exec.getNode.mockReturnValue(node);
		exec.continueOnFail.mockReturnValue(false);
	});

	function setParams(params: Record<string, unknown>) {
		exec.getNodeParameter.mockImplementation((name: string, index: number) => {
			// Prefer specific index key, fall back to global
			const key = `${name}@${index}`;
			if (key in params) return params[key] as unknown as any;
			return params[name] as unknown as any;
		});
	}

	it('Throws When Operation Is LLM-based And Model Is Null', async () => {
		setParams({
			text: 'hello',
			operation: 'classify',
			guardrails: { nsfw: { value: { threshold: 0.5 } } },
			customizeSystemMessage: false,
		});

		await expect(processGuardrails.call(exec, 0, null as unknown as BaseChatModel)).rejects.toThrow(
			'Chat Model is required',
		);
	});

	it('Sanitize: Throws NodeOperationError When Any Preflight Check Fails', async () => {
		const piiCheck = jest.fn().mockImplementation(() => ({
			guardrailName: 'personalData',
			tripwireTriggered: false,
			executionFailed: true,
			info: {},
		}));
		(createPiiCheckFn as jest.Mock).mockReturnValueOnce(piiCheck);
		setParams({
			text: 'txt',
			operation: 'sanitize',
			guardrails: { pii: { value: { entities: ['EMAIL'] } } },
		});

		await expect(processGuardrails.call(exec, 0, null as unknown as BaseChatModel)).rejects.toThrow(
			NodeOperationError,
		);
	});

	it('Classify: Unexpected Error In Input Stage Throws', async () => {
		setParams({ text: 't', operation: 'classify', guardrails: { keywords: 'x' } });
		const model = {} as BaseChatModel;
		(createKeywordsCheckFn as jest.Mock).mockReturnValueOnce(
			jest.fn(() => {
				throw new Error('boom');
			}),
		);
		await expect(processGuardrails.call(exec, 0, model)).rejects.toThrow('boom');
	});

	it('Classify: Non-Unexpected Failure Returns Failed Results', async () => {
		setParams({ text: 't', operation: 'classify', guardrails: { keywords: 'x' } });
		const model = {} as BaseChatModel;
		(createKeywordsCheckFn as jest.Mock).mockReturnValueOnce(
			jest.fn(() => ({ guardrailName: 'keywords', tripwireTriggered: true, info: {} })),
		);
		const res = await processGuardrails.call(exec, 0, model);
		expect(res.failed).not.toBeNull();
		expect(res.passed).toBeNull();
		expect(res.failed?.checks[0]).toMatchObject({ name: 'keywords', triggered: true });
		expect(res.guardrailsInput).toBe('t');
	});

	it('All Pass: Returns Combined Passed Checks And Modified Input', async () => {
		setParams({
			text: 'abc',
			operation: 'classify',
			guardrails: { pii: { value: { entities: ['EMAIL'] } }, keywords: 'foo' },
		});
		const model = {} as BaseChatModel;
		(createPiiCheckFn as jest.Mock).mockReturnValueOnce(
			jest.fn(() => ({
				guardrailName: 'personalData',
				tripwireTriggered: false,
				info: { maskEntities: { EMAIL: ['abc'] } },
			})),
		);
		(createKeywordsCheckFn as jest.Mock).mockReturnValueOnce(
			jest.fn(() => ({ guardrailName: 'keywords', tripwireTriggered: false, info: {} })),
		);
		const res = await processGuardrails.call(exec, 0, model);
		expect(res.failed).toBeNull();
		if (!res.passed) throw new Error('Expected passed results');
		expect(res.passed.checks.length).toBeGreaterThanOrEqual(2);
		expect(res.guardrailsInput).toBe('<EMAIL>');
	});

	it('Classify: Preflight Failure Returns Failed Results', async () => {
		setParams({
			text: 'pre',
			operation: 'classify',
			guardrails: { secretKeys: { value: { permissiveness: 0.5 } } },
		});
		const model = {} as BaseChatModel;
		(createSecretKeysCheckFn as jest.Mock).mockReturnValueOnce(
			jest.fn(() => ({ guardrailName: 'secretKeys', tripwireTriggered: true, info: {} })),
		);
		const res = await processGuardrails.call(exec, 0, model);
		expect(res.failed).not.toBeNull();
		expect(res.passed).toBeNull();
		expect(res.guardrailsInput).toBe('pre');
		expect(res.failed?.checks[0]).toMatchObject({ name: 'secretKeys', triggered: true });
	});

	it('Classify: Unexpected Error With ContinueOnFail Returns Failed', async () => {
		setParams({ text: 'inp', operation: 'classify', guardrails: { keywords: 'x' } });
		exec.continueOnFail.mockReturnValue(true);
		const model = {} as BaseChatModel;
		(createKeywordsCheckFn as jest.Mock).mockReturnValueOnce(
			jest.fn(() => {
				throw new Error('kaboom');
			}),
		);
		const res = await processGuardrails.call(exec, 0, model);
		expect(res.failed).not.toBeNull();
		expect(res.passed).toBeNull();
		expect(res.failed?.checks[0].executionFailed).toBe(true);
	});

	it('Configures Checks Based On Guardrails Options', async () => {
		setParams({
			text: 'xyz',
			operation: 'classify',
			customizeSystemMessage: true,
			systemMessage: 'SYS',
			guardrails: {
				pii: { value: { entities: ['EMAIL'] } },
				customRegex: { regex: 'foo.*' },
				secretKeys: { value: { permissiveness: 0.5 } },
				urls: {
					value: {
						allowedUrls: 'https://a.com, https://b.com',
						allowedSchemes: ['https'],
						blockUserinfo: true,
						allowSubdomains: false,
					},
				},
				keywords: 'alpha, beta',
				jailbreak: { value: { threshold: 0.2, prompt: '' } },
				nsfw: { value: { threshold: 0.3, prompt: '' } },
				topicalAlignment: { value: { threshold: 0.4, prompt: '' } },
				custom: {
					guardrail: [
						{ name: 'c1', threshold: 0.1, prompt: 'P1' },
						{ name: 'c2', threshold: 0.2, prompt: 'P2' },
					],
				},
			},
		});
		const model = {} as BaseChatModel;
		(createPiiCheckFn as jest.Mock).mockReturnValue(
			jest.fn(() => ({ guardrailName: 'pii', tripwireTriggered: false, info: {} })),
		);
		(createCustomRegexCheckFn as jest.Mock).mockReturnValue(
			jest.fn(() => ({ guardrailName: 'customRegex', tripwireTriggered: false, info: {} })),
		);
		(createKeywordsCheckFn as jest.Mock).mockReturnValue(
			jest.fn(() => ({ guardrailName: 'keywords', tripwireTriggered: false, info: {} })),
		);
		(createJailbreakCheckFn as jest.Mock).mockReturnValue(
			jest.fn(() => ({ guardrailName: 'jailbreak', tripwireTriggered: false, info: {} })),
		);
		(createNSFWCheckFn as jest.Mock).mockReturnValue(
			jest.fn(() => ({ guardrailName: 'nsfw', tripwireTriggered: false, info: {} })),
		);
		(createTopicalAlignmentCheckFn as jest.Mock).mockReturnValue(
			jest.fn(() => ({ guardrailName: 'topicalAlignment', tripwireTriggered: false, info: {} })),
		);
		(createSecretKeysCheckFn as jest.Mock).mockReturnValue(
			jest.fn(() => ({ guardrailName: 'secret', tripwireTriggered: false, info: {} })),
		);
		(createUrlsCheckFn as jest.Mock).mockReturnValue(
			jest.fn(() => ({ guardrailName: 'urls', tripwireTriggered: false, info: {} })),
		);
		(createLLMCheckFn as jest.Mock).mockReturnValue(
			jest.fn(() => ({ guardrailName: 'custom', tripwireTriggered: false, info: {} })),
		);

		await processGuardrails.call(exec, 0, model);

		expect(createPiiCheckFn).toHaveBeenCalledWith({ entities: ['EMAIL'] });
		expect(createSecretKeysCheckFn).toHaveBeenCalledWith({ threshold: 0.5 });
		expect(createUrlsCheckFn).toHaveBeenCalledWith({
			allowedUrls: ['https://a.com', 'https://b.com'],
			allowedSchemes: ['https'],
			blockUserinfo: true,
			allowSubdomains: false,
		});
		expect(createKeywordsCheckFn).toHaveBeenCalledWith({ keywords: ['alpha', 'beta'] });
		expect(createJailbreakCheckFn).toHaveBeenCalledWith({
			model,
			prompt: 'DEFAULT_JAILBREAK',
			threshold: 0.2,
			systemMessage: 'SYS',
		});
		expect(createNSFWCheckFn).toHaveBeenCalledWith({
			model,
			prompt: 'DEFAULT_NSFW',
			threshold: 0.3,
			systemMessage: 'SYS',
		});
		expect(createTopicalAlignmentCheckFn).toHaveBeenCalledWith({
			model,
			prompt: 'DEFAULT_TOPICAL',
			systemMessage: 'SYS',
			threshold: 0.4,
		});
		expect(createLLMCheckFn).toHaveBeenNthCalledWith(1, 'c1', {
			model,
			prompt: 'P1',
			threshold: 0.1,
			systemMessage: 'SYS',
		});
		expect(createLLMCheckFn).toHaveBeenNthCalledWith(2, 'c2', {
			model,
			prompt: 'P2',
			threshold: 0.2,
			systemMessage: 'SYS',
		});
	});
});
