import type { InstanceAiEvalMockLookup } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ExploreResourcesParams } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { EvalMockedCredentialsHelper } from './eval-mocked-credentials-helper';
import { createLlmMockHandler } from './mock-handler';
import { truncateForLlm } from './request-sanitizer';
import { EvalThreadCredentialAllowlistService } from './thread-credential-allowlist.service';

/**
 * The context of a mock that answers before any scenario exists. The user's request names the
 * resources and fields, so the lookup answers agree with the case.
 */
export function designTimeMockContext(userRequests: string): string {
	return userRequests
		? `This is a workflow build. The user asked: ${truncateForLlm(userRequests)}\n` +
				'Every resource the user names exists and has every field the request names, spelled exactly as written.'
		: '';
}

/** An execution scenario of an eval case, as the harness sends it. */
export interface DesignTimeMockScenario {
	readonly name: string;
	readonly dataSetup: string;
}

const MAX_SCENARIO_HINT_CHARS = 8_000;

/**
 * The scenarios of the case, for the mock of the build. The responses that the agent sees at
 * build time then have the shape that the scenario runs give, so a wrong declared shape drifts.
 * The scenarios can hold different values, so one rule picks them.
 */
export function designTimeScenarioHints(scenarios: readonly DesignTimeMockScenario[]): string {
	if (scenarios.length === 0) return '';
	const text =
		'The test scenarios of this case describe the data that the services hold:\n' +
		scenarios.map(({ name, dataSetup }) => `- ${name}: ${dataSetup}`).join('\n') +
		'\nGive each response the shape that these scenarios give it. When they hold different data, ' +
		'use the data of the first scenario that describes a successful response.';
	return text.length > MAX_SCENARIO_HINT_CHARS
		? `${text.slice(0, MAX_SCENARIO_HINT_CHARS)}... [truncated]`
		: text;
}

/** Notion accepts an ID with or without dashes, in either case. */
const comparable = (value: string) => value.replaceAll('-', '').toLowerCase();

/** The string values in `value`, at any depth. */
const stringsOf = (value: unknown): string[] =>
	typeof value === 'string'
		? [value]
		: Array.isArray(value)
			? value.flatMap(stringsOf)
			: isRecord(value)
				? Object.values(value).flatMap(stringsOf)
				: [];

/**
 * How long a build waits for a mocked resource lookup. One LLM mock call takes 10-30 s and a
 * lookup can make two. The default budget of a real API cuts the lookup off every time.
 */
export const EVAL_MOCK_LOOKUP_TIMEOUT_MS = 60_000;

/** Sends the HTTP of a run to `handler`, with the credential handling of a scenario run. */
export function configureEvalMockRun(
	handler: EvalLlmMockHandler,
	logger: Logger,
): (additionalData: IWorkflowExecuteAdditionalData) => void {
	return (additionalData) => {
		additionalData.credentialsHelper = new EvalMockedCredentialsHelper(
			additionalData.credentialsHelper,
			undefined,
			logger,
		);
		additionalData.evalLlmMockHandler = handler;
	};
}

/**
 * Design-time HTTP of an eval build thread: resource lookups and verification runs. Eval
 * credentials hold placeholder tokens and eval cases name hosts that do not exist, so these
 * calls fail for real. In an eval thread they go to the LLM mock of scenario runs instead. A
 * thread is an eval thread when the harness pinned its credentials. Other threads get no mock.
 */
@Service()
export class EvalDesignTimeMockService {
	private readonly byThread = new Map<string, Promise<EvalLlmMockHandler>>();

	private readonly scenariosByThread = new Map<string, readonly DesignTimeMockScenario[]>();

	private readonly lookupsByThread = new Map<string, readonly InstanceAiEvalMockLookup[]>();

	constructor(private readonly credentialAllowlists: EvalThreadCredentialAllowlistService) {}

	/**
	 * One mock for each thread: its cache gives a repeated request the same answer, so the
	 * lookups and verification runs of a build agree, and a request costs one LLM call.
	 */
	async handlerFor(
		threadId: string,
		userRequests: () => Promise<string>,
	): Promise<EvalLlmMockHandler | undefined> {
		if (this.credentialAllowlists.get(threadId) === undefined) return undefined;
		const known = this.byThread.get(threadId);
		if (known) return await known;
		const scenarioHints = designTimeScenarioHints(this.scenariosByThread.get(threadId) ?? []);
		const created = userRequests()
			.catch(() => '')
			.then((requests) =>
				createLlmMockHandler({
					globalContext: designTimeMockContext(requests),
					...(scenarioHints ? { scenarioHints } : {}),
				}),
			);
		this.byThread.set(threadId, created);
		return await created;
	}

	/** The scenarios of the case that the thread builds for. The next mock of the thread reads them. */
	setScenarios(threadId: string, scenarios: readonly DesignTimeMockScenario[]): void {
		this.scenariosByThread.set(threadId, scenarios);
		this.byThread.delete(threadId);
	}

	/** The declared field lookup answers of the case that the thread builds for. */
	setLookups(threadId: string, lookups: readonly InstanceAiEvalMockLookup[]): void {
		this.lookupsByThread.set(threadId, lookups);
	}

	/**
	 * The declared fields of a field lookup in an eval thread, or `undefined` when the case declares
	 * no answer. A node parameter can hold a resource ID in a URL, so a value that contains the ID
	 * matches.
	 */
	lookupAnswer(
		threadId: string,
		{
			methodName,
			methodType,
			currentNodeParameters,
		}: Pick<ExploreResourcesParams, 'methodName' | 'methodType' | 'currentNodeParameters'>,
	): InstanceAiEvalMockLookup['fields'] | undefined {
		if (methodType !== 'loadOptions' || this.credentialAllowlists.get(threadId) === undefined) {
			return undefined;
		}
		const values = stringsOf(currentNodeParameters).map(comparable);
		return this.lookupsByThread
			.get(threadId)
			?.find(
				({ method, resourceIds }) =>
					method === methodName &&
					resourceIds.every((id) => values.some((value) => value.includes(comparable(id)))),
			)?.fields;
	}

	clearThread(threadId: string): void {
		this.byThread.delete(threadId);
		this.scenariosByThread.delete(threadId);
		this.lookupsByThread.delete(threadId);
	}
}
