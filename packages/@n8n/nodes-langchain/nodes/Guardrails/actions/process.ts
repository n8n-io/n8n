import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { runStageGuardrails } from '../helpers/base';
import { splitByComma } from '../helpers/common';
import { mapGuardrailResultToUserResult } from '../helpers/mappers';
import { createLLMCheckFn } from '../helpers/model';
import { applyPreflightModifications } from '../helpers/preflight';
import { createJailbreakCheckFn } from './checks/jailbreak';
import { createKeywordsCheckFn } from './checks/keywords';
import { createNSFWCheckFn } from './checks/nsfw';
import { createPiiCheckFn } from './checks/pii';
import { createPromptInjectionCheckFn } from './checks/promptInjection';
import { createSecretKeysCheckFn } from './checks/secretKeys';
import { createTopicalAlignmentCheckFn } from './checks/topicalAlignment';
import { createUrlsCheckFn } from './checks/urls';
import type {
	GroupedGuardrailResults,
	GuardrailsOptions,
	GuardrailUserResult,
	StageGuardRails,
} from './types';

interface Result {
	text: string;
	checks: GuardrailUserResult[];
}

export async function process(
	this: IExecuteFunctions,
	itemIndex: number,
	model: BaseChatModel,
): Promise<{
	passed: Result | null;
	failed: Result | null;
}> {
	const inputText = this.getNodeParameter('inputText', itemIndex) as string;
	const violationBehavior = this.getNodeParameter('violationBehavior', itemIndex) as string;
	const guardrails = this.getNodeParameter('guardrails', itemIndex) as GuardrailsOptions;
	const failedChecks: GuardrailUserResult[] = [];
	const passedChecks: GuardrailUserResult[] = [];

	const handleFailedResults = (results: GroupedGuardrailResults): GuardrailUserResult[] => {
		const unexpectedError = results.failed.find(
			(result) =>
				result.status === 'rejected' ||
				(result.status === 'fulfilled' && result.value.executionFailed),
		);
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
		if (violationBehavior === 'routeToFailOutput' || this.continueOnFail()) {
			return results.failed.map(mapGuardrailResultToUserResult);
		}

		const failedGuardrails = results.failed
			.filter((result) => result.status === 'fulfilled')
			.map((result) => result.value.guardrailName);
		throw new NodeOperationError(this.getNode(), 'Guardrail Violation', {
			description: `Guardrail violation occurred in ${failedGuardrails.join(', ')} guardrails`,
			itemIndex,
		});
	};

	const stageGuardrails: StageGuardRails = {
		preflight: [],
		input: [],
	};

	if (guardrails.pii?.value) {
		const { mode, entities, customRegex } = guardrails.pii.value;
		stageGuardrails.preflight.push({
			name: 'pii',
			check: createPiiCheckFn({
				block: mode === 'block',
				entities,
				customRegex: customRegex?.regex,
			}),
		});
	}

	if (guardrails.secretKeys?.value) {
		const { mode, permissiveness } = guardrails.secretKeys.value;
		stageGuardrails.preflight.push({
			name: 'secretKeys',
			check: createSecretKeysCheckFn({ block: mode === 'block', threshold: permissiveness }),
		});
	}

	if (guardrails.urls?.value) {
		const { allowedUrls, allowedSchemes, blockUserinfo, allowSubdomains, mode } =
			guardrails.urls.value;
		stageGuardrails.preflight.push({
			name: 'urls',
			check: createUrlsCheckFn({
				allowedUrls: splitByComma(allowedUrls),
				allowedSchemes,
				blockUserinfo,
				allowSubdomains,
				block: mode === 'block',
			}),
		});
	}

	if (guardrails.jailbreak?.value) {
		const { prompt, threshold } = guardrails.jailbreak.value;
		stageGuardrails.input.push({
			name: 'jailbreak',
			check: createJailbreakCheckFn({ model, prompt, threshold }),
		});
	}

	if (guardrails.nsfw?.value) {
		const { prompt, threshold } = guardrails.nsfw.value;
		stageGuardrails.input.push({
			name: 'nsfw',
			check: createNSFWCheckFn({ model, prompt, threshold }),
		});
	}

	if (guardrails.promptInjection?.value) {
		const { prompt, threshold } = guardrails.promptInjection.value;
		stageGuardrails.input.push({
			name: 'promptInjection',
			check: createPromptInjectionCheckFn({ model, prompt, threshold }),
		});
	}

	if (guardrails.topicalAlignment?.value) {
		const { prompt, threshold } = guardrails.topicalAlignment.value;
		stageGuardrails.input.push({
			name: 'topicalAlignment',
			check: createTopicalAlignmentCheckFn({ model, prompt, threshold }),
		});
	}

	if (guardrails.keywords) {
		stageGuardrails.input.push({
			name: 'keywords',
			check: createKeywordsCheckFn({ keywords: splitByComma(guardrails.keywords) }),
		});
	}

	if (guardrails.custom?.guardrail) {
		for (const customGuardrail of guardrails.custom.guardrail) {
			const { prompt, threshold, name } = customGuardrail;
			stageGuardrails.input.push({
				name,
				check: createLLMCheckFn(name, { model, prompt, threshold }),
			});
		}
	}

	const preflightResults = await runStageGuardrails(stageGuardrails, 'preflight', inputText);

	if (preflightResults.failed.length > 0) {
		failedChecks.push.apply(failedChecks, handleFailedResults(preflightResults));
		return {
			passed: null,
			failed: {
				text: inputText,
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

	const inputResults = await runStageGuardrails(stageGuardrails, 'input', modifiedInputText);
	if (inputResults.failed.length > 0) {
		failedChecks.push.apply(failedChecks, handleFailedResults(inputResults));
		return {
			passed: null,
			failed: {
				text: modifiedInputText,
				checks: failedChecks,
			},
		};
	} else {
		passedChecks.push.apply(passedChecks, inputResults.passed.map(mapGuardrailResultToUserResult));
	}

	return {
		passed: {
			text: modifiedInputText,
			checks: passedChecks,
		},
		failed: null,
	};
}
