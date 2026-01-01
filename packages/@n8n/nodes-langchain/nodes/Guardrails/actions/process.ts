import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { runStageGuardrails } from '../helpers/base';
import { splitByComma } from '../helpers/common';
import { mapGuardrailErrorsToMessage, mapGuardrailResultToUserResult } from '../helpers/mappers';
import { createLLMCheckFn } from '../helpers/model';
import { applyPreflightModifications } from '../helpers/preflight';
import { createJailbreakCheckFn, JAILBREAK_PROMPT } from './checks/jailbreak';
import { createKeywordsCheckFn } from './checks/keywords';
import { createNSFWCheckFn, NSFW_SYSTEM_PROMPT } from './checks/nsfw';
import { createCustomRegexCheckFn, createPiiCheckFn } from './checks/pii';
import { createSecretKeysCheckFn } from './checks/secretKeys';
import {
	createTopicalAlignmentCheckFn,
	TOPICAL_ALIGNMENT_SYSTEM_PROMPT,
} from './checks/topicalAlignment';
import { createUrlsCheckFn } from './checks/urls';
import type {
	GroupedGuardrailResults,
	GuardrailsOptions,
	GuardrailUserResult,
	StageGuardRails,
} from './types';

interface Result {
	checks: GuardrailUserResult[];
}

export async function process(
	this: IExecuteFunctions,
	itemIndex: number,
	model: BaseChatModel | null,
): Promise<{
	guardrailsInput: string;
	passed: Result | null;
	failed: Result | null;
}> {
	const inputText = this.getNodeParameter('text', itemIndex) as string;
	const operation = this.getNodeParameter('operation', 0) as 'classify' | 'sanitize';
	const guardrails = this.getNodeParameter('guardrails', itemIndex) as GuardrailsOptions;
	const customizeSystemMessage =
		operation === 'classify' &&
		(this.getNodeParameter('customizeSystemMessage', itemIndex, false) as boolean);
	const systemMessage = customizeSystemMessage
		? (this.getNodeParameter('systemMessage', itemIndex) as string)
		: undefined;
	const failedChecks: GuardrailUserResult[] = [];
	const passedChecks: GuardrailUserResult[] = [];

	const handleFailedResults = (results: GroupedGuardrailResults): GuardrailUserResult[] => {
		const unexpectedError = results.failed.find(
			(result) =>
				result.status === 'rejected' ||
				(result.status === 'fulfilled' && result.value.executionFailed),
		);

		if (results.failed.length && operation === 'sanitize') {
			throw new NodeOperationError(this.getNode(), 'Failed to sanitize text', {
				description: mapGuardrailErrorsToMessage(results.failed),
				itemIndex,
			});
		}
		if (unexpectedError && !this.continueOnFail()) {
			const error =
				unexpectedError.status === 'rejected'
					? unexpectedError.reason
					: unexpectedError.value.originalException;
			throw new NodeOperationError(this.getNode(), error, {
				description: error?.description || error?.message,
				itemIndex,
			});
		}
		return results.failed.map(mapGuardrailResultToUserResult);
	};

	const stageGuardrails: StageGuardRails = {
		preflight: [],
		input: [],
	};

	const checkModelAvailable = (model: BaseChatModel | null): model is BaseChatModel => {
		if (!model) {
			throw new NodeOperationError(this.getNode(), 'Chat Model is required');
		}
		return true;
	};

	if (guardrails.pii?.value) {
		const { entities } = guardrails.pii.value;
		stageGuardrails.preflight.push({
			name: 'personalData',
			check: createPiiCheckFn({
				entities,
			}),
		});
	}

	if (guardrails.customRegex?.regex) {
		stageGuardrails.preflight.push({
			name: 'customRegex',
			check: createCustomRegexCheckFn({
				customRegex: guardrails.customRegex.regex,
			}),
		});
	}

	if (guardrails.secretKeys?.value) {
		const { permissiveness } = guardrails.secretKeys.value;
		stageGuardrails.preflight.push({
			name: 'secretKeys',
			check: createSecretKeysCheckFn({ threshold: permissiveness }),
		});
	}

	if (guardrails.urls?.value) {
		const { allowedUrls, allowedSchemes, blockUserinfo, allowSubdomains } = guardrails.urls.value;
		stageGuardrails.preflight.push({
			name: 'urls',
			check: createUrlsCheckFn({
				allowedUrls: splitByComma(allowedUrls),
				allowedSchemes,
				blockUserinfo,
				allowSubdomains,
			}),
		});
	}

	if (operation === 'classify') {
		if (guardrails.keywords) {
			stageGuardrails.input.push({
				name: 'keywords',
				check: createKeywordsCheckFn({ keywords: splitByComma(guardrails.keywords) }),
			});
		}

		if (guardrails.jailbreak?.value && checkModelAvailable(model)) {
			const { prompt, threshold } = guardrails.jailbreak.value;
			stageGuardrails.input.push({
				name: 'jailbreak',
				check: createJailbreakCheckFn({
					model,
					prompt: prompt?.trim() || JAILBREAK_PROMPT,
					threshold,
					systemMessage,
				}),
			});
		}

		if (guardrails.nsfw?.value && checkModelAvailable(model)) {
			const { prompt, threshold } = guardrails.nsfw.value;
			stageGuardrails.input.push({
				name: 'nsfw',
				check: createNSFWCheckFn({
					model,
					prompt: prompt?.trim() || NSFW_SYSTEM_PROMPT,
					threshold,
					systemMessage,
				}),
			});
		}

		if (guardrails.topicalAlignment?.value && checkModelAvailable(model)) {
			const { prompt, threshold } = guardrails.topicalAlignment.value;
			stageGuardrails.input.push({
				name: 'topicalAlignment',
				check: createTopicalAlignmentCheckFn({
					model,
					prompt: prompt?.trim() || TOPICAL_ALIGNMENT_SYSTEM_PROMPT,
					systemMessage,
					threshold,
				}),
			});
		}

		if (guardrails.custom?.guardrail && checkModelAvailable(model)) {
			for (const customGuardrail of guardrails.custom.guardrail) {
				const { prompt, threshold, name } = customGuardrail;
				stageGuardrails.input.push({
					name,
					check: createLLMCheckFn(name, {
						model,
						prompt,
						threshold,
						systemMessage,
					}),
				});
			}
		}
	}

	const preflightResults = await runStageGuardrails({
		inputText,
		stageGuardrails,
		stage: 'preflight',
		failOnlyOnErrors: operation === 'sanitize',
	});

	if (preflightResults.failed.length > 0) {
		failedChecks.push.apply(failedChecks, handleFailedResults(preflightResults));
		return {
			guardrailsInput: inputText,
			passed: null,
			failed: {
				checks: failedChecks,
			},
		};
	} else {
		passedChecks.push.apply(
			passedChecks,
			preflightResults.passed.map(mapGuardrailResultToUserResult),
		);
	}

	const modifiedInputText = applyPreflightModifications(
		inputText,
		preflightResults.passed.map((result) => result.value),
	);

	const inputResults = await runStageGuardrails({
		inputText: modifiedInputText,
		stageGuardrails,
		stage: 'input',
		failOnlyOnErrors: operation === 'sanitize',
	});
	if (inputResults.failed.length > 0) {
		failedChecks.push.apply(failedChecks, handleFailedResults(inputResults));
		return {
			guardrailsInput: modifiedInputText,
			passed: null,
			failed: {
				checks: failedChecks,
			},
		};
	} else {
		passedChecks.push.apply(passedChecks, inputResults.passed.map(mapGuardrailResultToUserResult));
	}

	return {
		guardrailsInput: modifiedInputText,
		passed: {
			checks: passedChecks,
		},
		failed: null,
	};
}
