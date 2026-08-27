import { describe, expect, it } from 'vitest';

import {
	findInteractionRenderer,
	type AgentsChatInteractionRenderer,
} from '../interactionRegistry';
import type { AgentsChatInteraction } from '../types';

const StubComponent = { template: '<div />' };

describe('agents chat interaction registry', () => {
	it('returns the first renderer whose matcher accepts the payload', () => {
		const payload = {
			toolName: 'custom_tool',
			toolCallId: 'tc1',
			input: {},
		} as unknown as AgentsChatInteraction;
		const renderer: AgentsChatInteractionRenderer = {
			key: 'custom',
			component: StubComponent,
			matches: (candidate) => String(candidate.toolName) === 'custom_tool',
		};

		expect(findInteractionRenderer(payload, [renderer])).toBe(renderer);
	});

	it('returns undefined for unknown payloads without a matching fallback', () => {
		const payload = {
			toolName: 'missing_tool',
			toolCallId: 'tc2',
			input: {},
		} as unknown as AgentsChatInteraction;

		expect(findInteractionRenderer(payload, [])).toBeUndefined();
	});
});
