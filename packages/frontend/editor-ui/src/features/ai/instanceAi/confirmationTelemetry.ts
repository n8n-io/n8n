import type {
	InstanceAiConfirmation,
	InstanceAiMcpConnectServer,
	InstanceAiQuestion,
} from '@n8n/api-types';
import type { useTelemetry } from '@n8n/composables/useTelemetry';
import { redactTelemetryProperties, type AssistantRuntime } from '@n8n/telemetry';

import type { QuestionAnswer } from './components/InstanceAiQuestions.vue';

// "User finished providing input" for an answered confirmation. Both Assistant
// runtimes build it here, so their events have the same shape.

export interface ProvidedInput {
	label: string;
	question?: string;
	input_type?: string;
	options: string[];
	option_chosen: string | string[];
}

export type SkippedInput = Omit<ProvidedInput, 'option_chosen'>;

export interface ConfirmationInputs {
	provided: ProvidedInput[];
	skipped: SkippedInput[];
	extra?: Record<string, unknown>;
}

type ConfirmationTypeFields = Partial<
	Pick<
		InstanceAiConfirmation,
		| 'testListener'
		| 'credentialDestination'
		| 'inputType'
		| 'setupRequests'
		| 'credentialRequests'
		| 'channelConfig'
		| 'mcpConnectRequest'
	>
>;

export function getConfirmationType(conf: ConfirmationTypeFields): string {
	if (conf.testListener) return 'test-listener';
	if (conf.credentialDestination) return 'credential-destination';
	if (conf.inputType) return conf.inputType;
	if (conf.setupRequests?.length) return 'setup';
	if (conf.credentialRequests?.length) return 'credential-setup';
	if (conf.channelConfig) return 'channel-config';
	if (conf.mcpConnectRequest) return 'mcp-connect';
	return 'approval';
}

export type ApprovalChoice = 'approve' | 'deny' | 'approve_always';

/** A plain approval or a credential destination. The options list "Always allow" only when the card offered it. */
export function approvalInputs(
	message: string,
	choice: ApprovalChoice,
	alwaysAllowAvailable: boolean,
): ConfirmationInputs {
	return {
		provided: [
			{
				label: message,
				options: alwaysAllowAvailable ? ['approve', 'deny', 'approve_always'] : ['approve', 'deny'],
				option_chosen: choice,
			},
		],
		skipped: [],
	};
}

export function textInputs(message: string, value: string): ConfirmationInputs {
	return {
		provided: [
			{ label: message, question: message, input_type: 'text', options: [], option_chosen: value },
		],
		skipped: [],
	};
}

export function skippedTextInputs(message: string): ConfirmationInputs {
	return {
		provided: [],
		skipped: [{ label: message, question: message, input_type: 'text', options: [] }],
	};
}

/** A click on the test listener card. A push event settles the card without a choice, so it has no inputs. */
export function testListenerInputs(message: string, approved: boolean): ConfirmationInputs {
	return {
		provided: [
			{ label: message, options: ['sent', 'cancel'], option_chosen: approved ? 'sent' : 'cancel' },
		],
		skipped: [],
	};
}

export function continueInputs(message: string): ConfirmationInputs {
	return {
		provided: [{ label: message, options: ['continue'], option_chosen: 'continue' }],
		skipped: [],
	};
}

/** The MCP connect card. A skip lists every offered server as skipped. */
export function mcpConnectInputs(
	servers: InstanceAiMcpConnectServer[],
	approved: boolean,
	connectedSlugs: string[],
): ConfirmationInputs {
	const options = servers.map((server) => server.serverSlug);
	return approved
		? { provided: [{ label: 'mcp-connect', options, option_chosen: connectedSlugs }], skipped: [] }
		: { provided: [], skipped: [{ label: 'mcp-connect', options }] };
}

export function questionsInputs(
	questions: InstanceAiQuestion[],
	answers: QuestionAnswer[],
): ConfirmationInputs {
	const questionsById = new Map(questions.map((q) => [q.id, q]));
	const answersById = new Map(answers.map((a) => [a.questionId, a]));
	const provided: ProvidedInput[] = [];
	const skipped: SkippedInput[] = [];
	for (const answer of answers) {
		const questionDef = questionsById.get(answer.questionId);
		// Options that follow an earlier answer, as the questions card shows them.
		const dependency = questionDef?.optionsByAnswer;
		const picked = dependency
			? answersById.get(dependency.questionId)?.selectedOptions[0]
			: undefined;
		const allOptions =
			(picked === undefined ? undefined : dependency?.options[picked]) ??
			questionDef?.options ??
			[];
		const inputType = questionDef?.type ?? 'text';

		if (answer.skipped) {
			skipped.push({
				label: answer.questionId,
				question: answer.question,
				input_type: inputType,
				options: allOptions,
			});
		} else {
			const isMulti = inputType === 'multi';
			const chosen: string | string[] = isMulti
				? [...answer.selectedOptions, ...(answer.customText ? [answer.customText] : [])]
				: answer.customText || answer.selectedOptions[0] || '';
			provided.push({
				label: answer.questionId,
				question: answer.question,
				input_type: inputType,
				options: allOptions,
				option_chosen: chosen,
			});
		}
	}
	return { provided, skipped, extra: { num_tasks: answers.length } };
}

export function trackInputCompleted(
	telemetry: ReturnType<typeof useTelemetry>,
	context: {
		threadId: string;
		inputThreadId?: string;
		instanceId: string;
		actionSource: string;
		type: string;
		runtime: AssistantRuntime;
	},
	inputs: ConfirmationInputs,
): void {
	const eventProps = {
		thread_id: context.threadId,
		input_thread_id: context.inputThreadId ?? '',
		instance_id: context.instanceId,
		action_source: context.actionSource,
		type: context.type,
		runtime: context.runtime,
		provided_inputs: inputs.provided,
		skipped_inputs: inputs.skipped,
		...inputs.extra,
	};
	// The inputs carry free text — what the user typed into a question card, and
	// the agent's own description of the action it wants to take. This event
	// reaches RudderStack *and* PostHog from the browser, so the backend
	// redactor never sees it. The `*_id` keys are exempted by the scrubber.
	telemetry.track('User finished providing input', redactTelemetryProperties(eventProps));
}
