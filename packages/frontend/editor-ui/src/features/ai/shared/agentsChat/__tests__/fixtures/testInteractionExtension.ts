import { defineComponent, h, type PropType } from 'vue';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentsChatInteractionExtension } from '../../interactionRegistry';
import type { ToolCall } from '../../types';

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
