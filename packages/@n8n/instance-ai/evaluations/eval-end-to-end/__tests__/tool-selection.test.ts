import type { InstanceAiRichMessagesResponse } from '@n8n/api-types';

import type { CapturedEvent } from '../../types';
import { extractToolSelection } from '../tool-selection';

function toolCallEvent(toolName: string, action?: string): CapturedEvent {
	return {
		timestamp: 0,
		type: 'tool-call',
		data: {
			type: 'tool-call',
			payload: {
				toolCallId: 'tc-1',
				toolName,
				args: action === undefined ? {} : { action },
			},
		},
	};
}

function confirmationRequestEvent(toolName: string, action: string): CapturedEvent {
	return {
		timestamp: 0,
		type: 'confirmation-request',
		data: {
			type: 'confirmation-request',
			payload: {
				requestId: 'r-1',
				toolName,
				args: { action },
			},
		},
	};
}

function richMessagesWithToolCalls(
	toolCalls: Array<{ toolName: string; args?: Record<string, unknown> }>,
): InstanceAiRichMessagesResponse {
	return {
		messages: [
			{
				agentTree: {
					agentId: 'root',
					role: 'orchestrator',
					status: 'completed',
					textContent: '',
					reasoning: '',
					toolCalls: toolCalls.map((tc, i) => ({
						toolCallId: `tc-${i}`,
						toolName: tc.toolName,
						args: tc.args ?? {},
						isLoading: false,
					})),
					children: [],
					timeline: [],
				},
			},
		],
	} as unknown as InstanceAiRichMessagesResponse;
}

describe('extractToolSelection', () => {
	describe('evalsActionsCalled', () => {
		it('returns an empty array when no evals action ran', () => {
			const result = extractToolSelection({ events: [] });
			expect(result.evalsActionsCalled).toEqual([]);
		});

		it('captures actions from tool-call events', () => {
			const result = extractToolSelection({
				events: [toolCallEvent('evals', 'offer'), toolCallEvent('evals', 'propose')],
			});
			expect(result.evalsActionsCalled).toEqual(['offer', 'propose']);
		});

		it('captures actions from confirmation-request events', () => {
			const result = extractToolSelection({
				events: [
					confirmationRequestEvent('evals', 'recommend-metric'),
					confirmationRequestEvent('evals', 'offer-data-population'),
				],
			});
			expect(result.evalsActionsCalled).toEqual(['recommend-metric', 'offer-data-population']);
		});

		it('captures actions from rich-message tool calls', () => {
			const result = extractToolSelection({
				events: [],
				threadMessages: richMessagesWithToolCalls([
					{ toolName: 'evals', args: { action: 'select-metrics' } },
					{ toolName: 'evals', args: { action: 'propose' } },
				]),
			});
			expect(result.evalsActionsCalled).toEqual(['select-metrics', 'propose']);
		});

		it('deduplicates actions seen from multiple sources', () => {
			const result = extractToolSelection({
				events: [
					toolCallEvent('evals', 'propose'),
					confirmationRequestEvent('evals', 'recommend-metric'),
				],
				threadMessages: richMessagesWithToolCalls([
					{ toolName: 'evals', args: { action: 'propose' } },
				]),
			});
			expect(result.evalsActionsCalled).toEqual(['recommend-metric', 'propose']);
		});

		it('ignores tool calls from other tools', () => {
			const result = extractToolSelection({
				events: [toolCallEvent('workflows', 'list'), toolCallEvent('eval-data')],
			});
			expect(result.evalsActionsCalled).toEqual([]);
		});

		it('preserves unknown action names so we notice drift', () => {
			const result = extractToolSelection({
				events: [toolCallEvent('evals', 'propose'), toolCallEvent('evals', 'invent-new-thing')],
			});
			expect(result.evalsActionsCalled).toEqual(['propose', 'invent-new-thing']);
		});
	});

	describe('findings', () => {
		it('flags missing propose action even when other evals actions ran', () => {
			const result = extractToolSelection({
				events: [
					toolCallEvent('evals', 'offer'),
					toolCallEvent('evals', 'recommend-metric'),
					toolCallEvent('eval-setup-with-agent'),
					toolCallEvent('eval-data'),
				],
			});
			const codes = result.findings.map((f) => f.code);
			expect(codes).toContain('evals_propose_not_called');
			expect(codes).not.toContain('evals_tool_not_called');
		});

		it('emits no findings for the Add-evals chain (offer is intentionally skipped)', () => {
			// The eval-end-to-end test prompt is an explicit "add evals" request,
			// which routes through the Add-evals flow. That flow skips `offer`
			// because user intent is explicit.
			const result = extractToolSelection({
				events: [
					toolCallEvent('evals', 'recommend-metric'),
					toolCallEvent('evals', 'propose'),
					toolCallEvent('eval-setup-with-agent'),
					toolCallEvent('evals', 'offer-data-population'),
					toolCallEvent('eval-data'),
				],
			});
			expect(result.findings).toEqual([]);
			expect(result.evalsActionsCalled).toEqual([
				'recommend-metric',
				'propose',
				'offer-data-population',
			]);
			expect(result.evalsToolCalled).toBe(true);
			expect(result.evalSetupAgentCalled).toBe(true);
			expect(result.evalDataToolCalled).toBe(true);
		});

		it('emits no findings for the Post-first-run chain (includes the offer step)', () => {
			const result = extractToolSelection({
				events: [
					toolCallEvent('evals', 'offer'),
					toolCallEvent('evals', 'recommend-metric'),
					toolCallEvent('evals', 'select-metrics'),
					toolCallEvent('evals', 'propose'),
					toolCallEvent('eval-setup-with-agent'),
					toolCallEvent('evals', 'offer-data-population'),
					toolCallEvent('eval-data'),
				],
			});
			expect(result.findings).toEqual([]);
		});

		it('flags evals_tool_not_called and evals_propose_not_called when evals never ran', () => {
			const result = extractToolSelection({ events: [] });
			const codes = result.findings.map((f) => f.code);
			expect(codes).toEqual(
				expect.arrayContaining([
					'evals_tool_not_called',
					'evals_propose_not_called',
					'eval_setup_agent_not_called',
					'eval_data_tool_not_called',
				]),
			);
		});
	});
});
