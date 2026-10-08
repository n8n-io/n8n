import { defineComponent, h, type PropType } from 'vue';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentsChatInteractionExtension } from '../../interactionRegistry';
import type { AgentsChatHostEvent, ChatMessage, ToolCall } from '../../types';

/** Test-only card input. A tool call is this card when its suspend payload has `testCard`. */
export interface TestCardInput {
	question: string;
	tool: string;
}

export const TEST_EXTENSION_KEY = 'test_card';

export const testCardSuspendPayload = { testCard: { question: 'Continue?' } };

function parseTestCard(toolCall: ToolCall): TestCardInput | undefined {
	const payload = toolCall.suspendPayload;
	if (!isRecord(payload) || !isRecord(payload.testCard)) return undefined;
	if (typeof payload.testCard.question !== 'string') return undefined;
	return { question: payload.testCard.question, tool: toolCall.tool };
}

export const TestCard = defineComponent({
	name: 'TestCard',
	props: {
		input: { type: Object as PropType<TestCardInput>, required: true },
		disabled: { type: Boolean, default: false },
	},
	emits: ['submit'],
	setup(props, { emit }) {
		return () =>
			h('div', { 'data-testid': 'test-card' }, [
				h('span', props.input.question),
				h(
					'button',
					{
						'data-testid': 'test-card-answer',
						disabled: props.disabled,
						onClick: () => emit('submit', { answer: 'yes' }),
					},
					'Yes',
				),
			]);
	},
});

/** A typed extension, as a host defines it. It must fit in an untyped list. */
export const testInteractionExtension: AgentsChatInteractionExtension<TestCardInput> = {
	key: TEST_EXTENSION_KEY,
	parse: parseTestCard,
	component: TestCard,
	getProps: (input) => ({ input }),
};

export const testInteractionExtensions: readonly AgentsChatInteractionExtension[] = [
	testInteractionExtension,
];

/** Test-only tool whose finished result the host renders. */
export const TEST_RESULT_TOOL_NAME = 'save_note';

export const TEST_RESULT_EXTENSION_KEY = 'test_result';

export const TestToolResult = defineComponent({
	name: 'TestToolResult',
	props: {
		toolCall: { type: Object as PropType<ToolCall>, required: true },
	},
	setup(props) {
		return () =>
			h('div', { 'data-testid': 'test-tool-result' }, [
				h('span', props.toolCall.toolCallId),
				h('pre', JSON.stringify(props.toolCall.output)),
			]);
	},
});

/** A host extension that only renders tool results. It has no card fields. */
export const testToolResultExtension: AgentsChatInteractionExtension = {
	key: TEST_RESULT_EXTENSION_KEY,
	matchToolResult: (toolCall) => toolCall.tool === TEST_RESULT_TOOL_NAME,
	resultComponent: TestToolResult,
};

/** Test-only host event names, one for each placement. */
export const TEST_HOST_EVENT = {
	START: 'test.start',
	END: 'test.end',
	TRANSIENT: 'test.transient',
	NONE: 'test.none',
} as const;

export const TestHostEvent = defineComponent({
	name: 'TestHostEvent',
	props: {
		event: { type: Object as PropType<AgentsChatHostEvent>, required: true },
		message: { type: Object as PropType<ChatMessage>, required: true },
	},
	setup(props) {
		return () =>
			h('div', { 'data-testid': 'test-host-event' }, [
				h('span', props.event.name),
				h('pre', JSON.stringify(props.event.payload)),
				h('em', props.message.id),
			]);
	},
});

function matchName(name: string) {
	return (event: AgentsChatHostEvent) => event.name === name;
}

/** Host extensions that render the test host events, one for each placement. */
export const testHostEventExtensions: readonly AgentsChatInteractionExtension[] = [
	{
		key: 'test_host_start',
		matchHostEvent: matchName(TEST_HOST_EVENT.START),
		hostEventComponent: TestHostEvent,
	},
	{
		key: 'test_host_end',
		matchHostEvent: matchName(TEST_HOST_EVENT.END),
		hostEventComponent: TestHostEvent,
		hostEventPlacement: 'end',
	},
	{
		key: 'test_host_transient',
		matchHostEvent: matchName(TEST_HOST_EVENT.TRANSIENT),
		hostEventComponent: TestHostEvent,
		hostEventPlacement: 'transient',
	},
	{
		key: 'test_host_none',
		matchHostEvent: matchName(TEST_HOST_EVENT.NONE),
		hostEventPlacement: 'none',
	},
];
