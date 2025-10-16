import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as CheckFunctions from '../actions/checks/jailbreak';
import * as KeywordsCheck from '../actions/checks/keywords';
import * as NSFWCheck from '../actions/checks/nsfw';
import * as PiiCheck from '../actions/checks/pii';
import * as PromptInjectionCheck from '../actions/checks/promptInjection';
import * as SecretKeysCheck from '../actions/checks/secretKeys';
import * as TopicalAlignmentCheck from '../actions/checks/topicalAlignment';
import * as UrlsCheck from '../actions/checks/urls';
import { process } from '../actions/process';
import type { GuardrailsOptions } from '../actions/types';
import * as BaseHelpers from '../helpers/base';
import * as MapperHelpers from '../helpers/mappers';
import * as ModelHelpers from '../helpers/model';
import * as PreflightHelpers from '../helpers/preflight';

interface TestParams {
	inputText: string;
	violationBehavior: string;
	guardrails: GuardrailsOptions | undefined;
	[key: string]: unknown;
}

describe('process', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: jest.Mocked<INode>;
	let mockModel: jest.Mocked<BaseChatModel>;
	const itemIndex = 0;

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'Guardrails Node',
			type: 'n8n-nodes-langchain.guardrails',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		mockModel = mock<BaseChatModel>();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	describe('successful execution', () => {
		it('should process text with no guardrails configured', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy.mockResolvedValue({
				passed: [],
				failed: [],
			});

			const result = await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(result).toEqual({
				passed: {
					text: inputText,
					checks: [],
				},
				failed: null,
			});
			expect(runStageGuardrailsSpy).toHaveBeenCalledTimes(2);
		});

		it('should process text with PII guardrail configured', async () => {
			const inputText = 'My email is john@example.com';
			const guardrails: GuardrailsOptions = {
				pii: {
					value: {
						mode: 'redact',
						type: 'all',
						entities: [],
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const createPiiCheckFnSpy = jest.spyOn(PiiCheck, 'createPiiCheckFn');
			const mockPiiCheck = jest.fn().mockResolvedValue({
				guardrailName: 'pii',
				tripwireTriggered: false,
				executionFailed: false,
				info: { maskEntities: { EMAIL: ['john@example.com'] } },
			});
			createPiiCheckFnSpy.mockReturnValue(mockPiiCheck);

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy
				.mockResolvedValueOnce({
					passed: [
						{
							status: 'fulfilled' as const,
							value: {
								guardrailName: 'pii',
								tripwireTriggered: false,
								executionFailed: false,
								info: { maskEntities: { EMAIL: ['john@example.com'] } },
							},
						},
					],
					failed: [],
				})
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				});

			const applyPreflightModificationsSpy = jest.spyOn(
				PreflightHelpers,
				'applyPreflightModifications',
			);
			applyPreflightModificationsSpy.mockReturnValue('My email is <EMAIL>');

			const mapGuardrailResultToUserResultSpy = jest.spyOn(
				MapperHelpers,
				'mapGuardrailResultToUserResult',
			);
			mapGuardrailResultToUserResultSpy.mockReturnValue({
				name: 'pii',
				triggered: false,
				executionFailed: false,
			});

			const result = await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(result).toEqual({
				passed: {
					text: 'My email is <EMAIL>',
					checks: [
						{
							name: 'pii',
							triggered: false,
							executionFailed: false,
						},
					],
				},
				failed: null,
			});
			expect(createPiiCheckFnSpy).toHaveBeenCalledWith({
				block: false,
				entities: [],
				customRegex: undefined,
			});
			expect(applyPreflightModificationsSpy).toHaveBeenCalledWith(inputText, [
				{
					guardrailName: 'pii',
					tripwireTriggered: false,
					executionFailed: false,
					info: { maskEntities: { EMAIL: ['john@example.com'] } },
				},
			]);
		});

		it('should process text with multiple guardrails configured', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {
				pii: {
					value: {
						mode: 'block',
						type: 'all',
						entities: [],
					},
				},
				secretKeys: {
					value: {
						mode: 'block',
						permisiveness: 'strict',
					},
				},
				jailbreak: {
					value: {
						prompt: 'Detect jailbreak attempts',
						threshold: 0.8,
					},
				},
				keywords: 'badword,spam',
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const createPiiCheckFnSpy = jest.spyOn(PiiCheck, 'createPiiCheckFn');
			const createSecretKeysCheckFnSpy = jest.spyOn(SecretKeysCheck, 'createSecretKeysCheckFn');
			const createJailbreakCheckFnSpy = jest.spyOn(CheckFunctions, 'createJailbreakCheckFn');
			const createKeywordsCheckFnSpy = jest.spyOn(KeywordsCheck, 'createKeywordsCheckFn');

			createPiiCheckFnSpy.mockReturnValue(jest.fn());
			createSecretKeysCheckFnSpy.mockReturnValue(jest.fn());
			createJailbreakCheckFnSpy.mockReturnValue(jest.fn());
			createKeywordsCheckFnSpy.mockReturnValue(jest.fn());

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				})
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				});

			const result = await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(result.passed).toBeDefined();
			expect(result.failed).toBeNull();
			expect(createPiiCheckFnSpy).toHaveBeenCalledWith({
				block: true,
				entities: [],
				customRegex: undefined,
			});
			expect(createSecretKeysCheckFnSpy).toHaveBeenCalledWith({
				block: true,
				threshold: 'strict',
			});
			expect(createJailbreakCheckFnSpy).toHaveBeenCalledWith({
				model: mockModel,
				prompt: 'Detect jailbreak attempts',
				threshold: 0.8,
			});
			expect(createKeywordsCheckFnSpy).toHaveBeenCalledWith({
				keywords: ['badword', 'spam'],
			});
		});

		it('should process text with custom guardrails configured', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {
				custom: {
					guardrail: [
						{
							name: 'customCheck',
							prompt: 'Custom validation prompt',
							threshold: 0.7,
						},
					],
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const createLLMCheckFnSpy = jest.spyOn(ModelHelpers, 'createLLMCheckFn');
			createLLMCheckFnSpy.mockReturnValue(jest.fn());

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				})
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				});

			const result = await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(result.passed).toBeDefined();
			expect(result.failed).toBeNull();
			expect(createLLMCheckFnSpy).toHaveBeenCalledWith('customCheck', {
				model: mockModel,
				prompt: 'Custom validation prompt',
				threshold: 0.7,
			});
		});
	});

	describe('error handling', () => {
		it('should throw error when preflight guardrails fail and violationBehavior is throwError', async () => {
			const inputText = 'This contains sensitive data';
			const guardrails: GuardrailsOptions = {
				pii: {
					value: {
						mode: 'block',
						type: 'all',
						entities: [],
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy.mockResolvedValueOnce({
				passed: [],
				failed: [
					{
						status: 'fulfilled' as const,
						value: {
							guardrailName: 'pii',
							tripwireTriggered: true,
							executionFailed: false,
							info: {},
						},
					},
				],
			});

			await expect(process.call(mockExecuteFunctions, itemIndex, mockModel)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should return failed result when preflight guardrails fail and violationBehavior is routeToFailOutput', async () => {
			const inputText = 'This contains sensitive data';
			const guardrails: GuardrailsOptions = {
				pii: {
					value: {
						mode: 'block',
						type: 'all',
						entities: [],
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'routeToFailOutput',
					guardrails,
				};
				return params[paramName] as any;
			});

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy.mockResolvedValueOnce({
				passed: [],
				failed: [
					{
						status: 'fulfilled' as const,
						value: {
							guardrailName: 'pii',
							tripwireTriggered: true,
							executionFailed: false,
							info: {},
						},
					},
				],
			});

			const mapGuardrailResultToUserResultSpy = jest.spyOn(
				MapperHelpers,
				'mapGuardrailResultToUserResult',
			);
			mapGuardrailResultToUserResultSpy.mockReturnValue({
				name: 'pii',
				triggered: true,
				executionFailed: false,
			});

			const result = await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(result).toEqual({
				passed: null,
				failed: {
					text: inputText,
					checks: [
						{
							name: 'pii',
							triggered: true,
							executionFailed: false,
						},
					],
				},
			});
		});

		it('should return failed result when preflight guardrails fail and continueOnFail is true', async () => {
			const inputText = 'This contains sensitive data';
			const guardrails: GuardrailsOptions = {
				pii: {
					value: {
						mode: 'block',
						type: 'all',
						entities: [],
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy.mockResolvedValueOnce({
				passed: [],
				failed: [
					{
						status: 'fulfilled' as const,
						value: {
							guardrailName: 'pii',
							tripwireTriggered: true,
							executionFailed: false,
							info: {},
						},
					},
				],
			});

			const mapGuardrailResultToUserResultSpy = jest.spyOn(
				MapperHelpers,
				'mapGuardrailResultToUserResult',
			);
			mapGuardrailResultToUserResultSpy.mockReturnValue({
				name: 'pii',
				triggered: true,
				executionFailed: false,
			});

			const result = await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(result.failed).toBeDefined();
			expect(result.passed).toBeNull();
		});

		it('should throw error when input guardrails fail and violationBehavior is throwError', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {
				jailbreak: {
					value: {
						prompt: 'Detect jailbreak attempts',
						threshold: 0.8,
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				})
				.mockResolvedValueOnce({
					passed: [],
					failed: [
						{
							status: 'fulfilled' as const,
							value: {
								guardrailName: 'jailbreak',
								tripwireTriggered: true,
								executionFailed: false,
								info: {},
							},
						},
					],
				});

			await expect(process.call(mockExecuteFunctions, itemIndex, mockModel)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle execution failures in guardrails', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {
				pii: {
					value: {
						mode: 'block',
						type: 'all',
						entities: [],
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy.mockResolvedValueOnce({
				passed: [],
				failed: [
					{
						status: 'fulfilled' as const,
						value: {
							guardrailName: 'pii',
							tripwireTriggered: true,
							executionFailed: true,
							originalException: new Error('PII check failed'),
							info: {},
						},
					},
				],
			});

			await expect(process.call(mockExecuteFunctions, itemIndex, mockModel)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle rejected promises in guardrails', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {
				pii: {
					value: {
						mode: 'block',
						type: 'all',
						entities: [],
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy.mockResolvedValueOnce({
				passed: [],
				failed: [
					{
						status: 'rejected' as const,
						reason: new Error('Guardrail execution failed'),
					},
				],
			});

			await expect(process.call(mockExecuteFunctions, itemIndex, mockModel)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('guardrail configuration', () => {
		it('should configure URLs guardrail correctly', async () => {
			const inputText = 'Check this URL: https://example.com';
			const guardrails: GuardrailsOptions = {
				urls: {
					value: {
						mode: 'block',
						allowedUrls: 'https://trusted.com,https://safe.org',
						allowedSchemes: ['https'],
						blockUserinfo: true,
						allowSubdomains: false,
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const createUrlsCheckFnSpy = jest.spyOn(UrlsCheck, 'createUrlsCheckFn');
			createUrlsCheckFnSpy.mockReturnValue(jest.fn());

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				})
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				});

			await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(createUrlsCheckFnSpy).toHaveBeenCalledWith({
				allowedUrls: ['https://trusted.com', 'https://safe.org'],
				allowedSchemes: ['https'],
				blockUserinfo: true,
				allowSubdomains: false,
				block: true,
			});
		});

		it('should configure NSFW guardrail correctly', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {
				nsfw: {
					value: {
						prompt: 'Detect NSFW content',
						threshold: 0.9,
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const createNSFWCheckFnSpy = jest.spyOn(NSFWCheck, 'createNSFWCheckFn');
			createNSFWCheckFnSpy.mockReturnValue(jest.fn());

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				})
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				});

			await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(createNSFWCheckFnSpy).toHaveBeenCalledWith({
				model: mockModel,
				prompt: 'Detect NSFW content',
				threshold: 0.9,
			});
		});

		it('should configure prompt injection guardrail correctly', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {
				promptInjection: {
					value: {
						prompt: 'Detect prompt injection attempts',
						threshold: 0.7,
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const createPromptInjectionCheckFnSpy = jest.spyOn(
				PromptInjectionCheck,
				'createPromptInjectionCheckFn',
			);
			createPromptInjectionCheckFnSpy.mockReturnValue(jest.fn());

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				})
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				});

			await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(createPromptInjectionCheckFnSpy).toHaveBeenCalledWith({
				model: mockModel,
				prompt: 'Detect prompt injection attempts',
				threshold: 0.7,
			});
		});

		it('should configure topical alignment guardrail correctly', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {
				topicalAlignment: {
					value: {
						prompt: 'Check topical alignment',
						threshold: 0.6,
					},
				},
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const createTopicalAlignmentCheckFnSpy = jest.spyOn(
				TopicalAlignmentCheck,
				'createTopicalAlignmentCheckFn',
			);
			createTopicalAlignmentCheckFnSpy.mockReturnValue(jest.fn());

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				})
				.mockResolvedValueOnce({
					passed: [],
					failed: [],
				});

			await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(createTopicalAlignmentCheckFnSpy).toHaveBeenCalledWith({
				model: mockModel,
				prompt: 'Check topical alignment',
				threshold: 0.6,
			});
		});
	});

	describe('edge cases', () => {
		it('should handle empty input text', async () => {
			const inputText = '';
			const guardrails: GuardrailsOptions = {};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy.mockResolvedValue({
				passed: [],
				failed: [],
			});

			const applyPreflightModificationsSpy = jest.spyOn(
				PreflightHelpers,
				'applyPreflightModifications',
			);
			applyPreflightModificationsSpy.mockReturnValue('');

			const result = await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(result.passed).toBeDefined();
			expect(result.passed?.text).toBe('');
		});

		it('should handle undefined guardrails configuration', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy.mockResolvedValue({
				passed: [],
				failed: [],
			});

			const applyPreflightModificationsSpy = jest.spyOn(
				PreflightHelpers,
				'applyPreflightModifications',
			);
			applyPreflightModificationsSpy.mockReturnValue(inputText);

			const result = await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(result.passed).toBeDefined();
			expect(result.failed).toBeNull();
		});

		it('should handle guardrails with empty values', async () => {
			const inputText = 'This is a test message';
			const guardrails: GuardrailsOptions = {
				pii: { value: undefined },
				secretKeys: { value: undefined },
				urls: { value: undefined },
				jailbreak: { value: undefined },
				nsfw: { value: undefined },
				promptInjection: { value: undefined },
				topicalAlignment: { value: undefined },
				keywords: '',
				custom: { guardrail: [] },
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: TestParams = {
					inputText,
					violationBehavior: 'throwError',
					guardrails,
				};
				return params[paramName] as any;
			});

			const runStageGuardrailsSpy = jest.spyOn(BaseHelpers, 'runStageGuardrails');
			runStageGuardrailsSpy.mockResolvedValue({
				passed: [],
				failed: [],
			});

			const result = await process.call(mockExecuteFunctions, itemIndex, mockModel);

			expect(result.passed).toBeDefined();
			expect(result.failed).toBeNull();
		});
	});
});
