import type { INode } from 'n8n-workflow';

import { DESKTOP_ASSISTANT_TAG } from '../constants';
import {
	classifyWorkflowsForDesktopAssistant,
	deriveNextRunAt,
	deriveSourceLabel,
} from '../desktop-assistant.classifier';
import type { ClassifierInput } from '../desktop-assistant.classifier';

const SCHEDULE_TYPE = 'n8n-nodes-base.scheduleTrigger';
const MANUAL_TYPE = 'n8n-nodes-base.manualTrigger';
const WEBHOOK_TYPE = 'n8n-nodes-base.webhook';
const GMAIL_TRIGGER_TYPE = 'n8n-nodes-base.gmailTrigger';

function node(partial: Partial<INode> & { type: string }): INode {
	return {
		id: partial.id ?? `node-${partial.type}`,
		name: partial.name ?? partial.type,
		type: partial.type,
		typeVersion: partial.typeVersion ?? 1,
		position: partial.position ?? [0, 0],
		parameters: partial.parameters ?? {},
		credentials: partial.credentials,
		disabled: partial.disabled,
	};
}

function input(partial: Partial<ClassifierInput> & { workflowId: string }): ClassifierInput {
	return {
		workflowId: partial.workflowId,
		name: partial.name ?? `Workflow ${partial.workflowId}`,
		active: partial.active ?? true,
		nodes: partial.nodes ?? [node({ type: MANUAL_TYPE })],
		tags: partial.tags ?? [],
		settings: partial.settings,
		lastExecution: partial.lastExecution,
		emojiIcon: partial.emojiIcon,
		accessibleCredentialIds: partial.accessibleCredentialIds ?? new Set<string>(),
	};
}

describe('classifyWorkflowsForDesktopAssistant — bucketing rules', () => {
	test('schedule trigger, inactive, tagged → actionNeeded', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				active: false,
				nodes: [
					node({
						type: SCHEDULE_TYPE,
						parameters: {
							rule: { interval: [{ field: 'cronExpression', expression: '0 7 * * 6' }] },
						},
					}),
				],
				tags: [{ name: DESKTOP_ASSISTANT_TAG }],
			}),
		]);
		expect(result.actionNeeded.map((c) => c.workflowId)).toEqual(['wf-1']);
		expect(result.upcoming).toHaveLength(0);
		expect(result.readyToRun).toHaveLength(0);
		expect(result.actionNeeded[0].description).toBe('Activation required');
	});

	test('schedule trigger, active, tagged → upcoming', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				active: true,
				nodes: [
					node({
						type: SCHEDULE_TYPE,
						parameters: {
							rule: { interval: [{ field: 'cronExpression', expression: '0 7 * * 6' }] },
						},
					}),
				],
				tags: [{ name: DESKTOP_ASSISTANT_TAG }],
			}),
		]);
		expect(result.upcoming).toHaveLength(1);
		expect(result.upcoming[0].source).toBe('desktop-assistant');
		expect(result.upcoming[0].trigger.kind).toBe('schedule');
	});

	test('manual trigger, tagged → readyToRun with desktop-assistant source', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				nodes: [node({ type: MANUAL_TYPE })],
				tags: [{ name: DESKTOP_ASSISTANT_TAG }],
			}),
		]);
		expect(result.readyToRun).toHaveLength(1);
		expect(result.readyToRun[0].source).toBe('desktop-assistant');
		expect(result.readyToRun[0].trigger.kind).toBe('manual');
	});

	test('manual trigger, untagged → readyToRun with user-built source', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				nodes: [node({ type: MANUAL_TYPE })],
				tags: [],
			}),
		]);
		expect(result.readyToRun).toHaveLength(1);
		expect(result.readyToRun[0].source).toBe('user-built');
	});

	test('webhook trigger, untagged → readyToRun (user-built), not in da buckets', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				active: true,
				nodes: [node({ type: WEBHOOK_TYPE })],
				tags: [],
			}),
		]);
		expect(result.readyToRun).toHaveLength(1);
		expect(result.readyToRun[0].source).toBe('user-built');
		expect(result.actionNeeded).toHaveLength(0);
		expect(result.upcoming).toHaveLength(0);
	});

	test('precedence: actionNeeded beats upcoming when both apply via missing credential', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				active: true,
				nodes: [
					node({
						type: GMAIL_TRIGGER_TYPE,
						credentials: { gmailOAuth2: { id: 'cred-missing', name: 'Gmail account' } },
					}),
				],
				tags: [{ name: DESKTOP_ASSISTANT_TAG }],
				accessibleCredentialIds: new Set<string>(),
			}),
		]);
		expect(result.actionNeeded).toHaveLength(1);
		expect(result.upcoming).toHaveLength(0);
		expect(result.actionNeeded[0].description).toBe('Gmail needs credential');
	});

	test('user-built workflow with a missing credential surfaces in actionNeeded (not gated on the desktop-assistant tag)', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-user-built',
				active: true,
				nodes: [
					node({
						type: GMAIL_TRIGGER_TYPE,
						credentials: { gmailOAuth2: { id: 'cred-missing', name: 'Gmail account' } },
					}),
				],
				tags: [],
				accessibleCredentialIds: new Set<string>(),
			}),
		]);
		expect(result.actionNeeded).toHaveLength(1);
		expect(result.actionNeeded[0].workflowId).toBe('wf-user-built');
		expect(result.actionNeeded[0].source).toBe('user-built');
		expect(result.actionNeeded[0].description).toBe('Gmail needs credential');
		expect(result.readyToRun).toHaveLength(0);
	});

	test('a credential slot with no id picked counts as "needs credential"', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-unconfigured',
				active: true,
				nodes: [
					node({
						type: GMAIL_TRIGGER_TYPE,
						// Slot exists on the node but no credential was ever picked.
						credentials: { gmailOAuth2: { id: '', name: '' } },
					}),
				],
				tags: [],
				accessibleCredentialIds: new Set<string>(),
			}),
		]);
		expect(result.actionNeeded).toHaveLength(1);
		expect(result.actionNeeded[0].description).toBe('Gmail needs credential');
	});

	test('a user-built workflow that is intentionally inactive is NOT flagged for activation (only credentials matter)', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-template',
				active: false,
				nodes: [
					node({ type: SCHEDULE_TYPE, parameters: { rule: { interval: [{ field: 'days' }] } } }),
				],
				tags: [],
			}),
		]);
		expect(result.actionNeeded).toHaveLength(0);
		expect(result.readyToRun).toHaveLength(1);
	});

	test('disabled nodes do not contribute missing credentials to actionNeeded', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-disabled-gmail',
				active: true,
				nodes: [
					node({ type: MANUAL_TYPE }),
					node({
						type: GMAIL_TRIGGER_TYPE,
						disabled: true,
						credentials: { gmailOAuth2: { id: '', name: '' } },
					}),
				],
				tags: [],
			}),
		]);
		expect(result.actionNeeded).toHaveLength(0);
		expect(result.readyToRun).toHaveLength(1);
	});

	test('runsLocally: workflow with a computerUse.* node → true', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				nodes: [
					node({ type: MANUAL_TYPE }),
					node({ type: 'n8n-nodes-base.computerUseClick', name: 'click' }),
				],
				tags: [{ name: DESKTOP_ASSISTANT_TAG }],
			}),
		]);
		expect(result.readyToRun[0].runsLocally).toBe(true);
	});

	test('runsLocally: vanilla workflow → false', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				nodes: [node({ type: MANUAL_TYPE }), node({ type: 'n8n-nodes-base.set' })],
				tags: [{ name: DESKTOP_ASSISTANT_TAG }],
			}),
		]);
		expect(result.readyToRun[0].runsLocally).toBe(false);
	});

	test('icon: emoji from meta overrides node icon', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				nodes: [node({ type: MANUAL_TYPE }), node({ type: 'n8n-nodes-base.set' })],
				tags: [{ name: DESKTOP_ASSISTANT_TAG }],
				emojiIcon: '🍌',
			}),
		]);
		expect(result.readyToRun[0].icon).toEqual({ type: 'emoji', value: '🍌' });
	});

	test('icon: falls back to first non-trigger node type', () => {
		const result = classifyWorkflowsForDesktopAssistant([
			input({
				workflowId: 'wf-1',
				nodes: [node({ type: MANUAL_TYPE }), node({ type: 'n8n-nodes-base.set' })],
				tags: [{ name: DESKTOP_ASSISTANT_TAG }],
			}),
		]);
		expect(result.readyToRun[0].icon).toEqual({
			type: 'node',
			nodeType: 'n8n-nodes-base.set',
		});
	});
});

describe('classifier derivations — exported helpers', () => {
	describe('deriveNextRunAt', () => {
		test('returns ISO string for a known cron expression', () => {
			const result = deriveNextRunAt(
				node({
					type: SCHEDULE_TYPE,
					parameters: {
						rule: { interval: [{ field: 'cronExpression', expression: '0 7 * * 6' }] },
					},
				}),
				{ now: new Date('2024-06-01T00:00:00Z'), timezone: 'UTC' },
			);
			expect(result).not.toBeNull();
			// 2024-06-01 is a Saturday, so the next run is today at 07:00 UTC
			expect(result).toBe('2024-06-01T07:00:00.000Z');
		});

		test('returns null when the interval is missing', () => {
			const result = deriveNextRunAt(node({ type: SCHEDULE_TYPE, parameters: {} }));
			expect(result).toBeNull();
		});

		test('returns null for sub-minute interval modes (seconds/minutes are not 5-field cron expressible)', () => {
			expect(
				deriveNextRunAt(
					node({
						type: SCHEDULE_TYPE,
						parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } },
					}),
				),
			).toBeNull();
			expect(
				deriveNextRunAt(
					node({
						type: SCHEDULE_TYPE,
						parameters: { rule: { interval: [{ field: 'seconds', secondsInterval: 30 }] } },
					}),
				),
			).toBeNull();
		});

		test('returns ISO string for structured "days" interval (default field, triggerAtHour only)', () => {
			const result = deriveNextRunAt(
				node({
					type: SCHEDULE_TYPE,
					parameters: { rule: { interval: [{ triggerAtHour: 7 }] } },
				}),
				{ now: new Date('2024-06-01T00:00:00Z'), timezone: 'UTC' },
			);
			// Default field='days', triggerAtHour=7, triggerAtMinute=0
			// → cron '0 7 */1 * *' → next run is today at 07:00 UTC
			expect(result).toBe('2024-06-01T07:00:00.000Z');
		});

		test('returns ISO string for explicit "days" interval with triggerAtMinute', () => {
			const result = deriveNextRunAt(
				node({
					type: SCHEDULE_TYPE,
					parameters: {
						rule: {
							interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 9, triggerAtMinute: 30 }],
						},
					},
				}),
				{ now: new Date('2024-06-01T00:00:00Z'), timezone: 'UTC' },
			);
			expect(result).toBe('2024-06-01T09:30:00.000Z');
		});

		test('returns ISO string for "hours" interval with step', () => {
			const result = deriveNextRunAt(
				node({
					type: SCHEDULE_TYPE,
					parameters: {
						rule: { interval: [{ field: 'hours', hoursInterval: 4, triggerAtMinute: 15 }] },
					},
				}),
				{ now: new Date('2024-06-01T01:00:00Z'), timezone: 'UTC' },
			);
			// cron '15 */4 * * *' → next match after 01:00 is 04:15
			expect(result).toBe('2024-06-01T04:15:00.000Z');
		});

		test('returns ISO string for "weeks" interval with triggerAtDayOfWeek list', () => {
			// 2024-06-01 is a Saturday (cron weekday 6)
			const result = deriveNextRunAt(
				node({
					type: SCHEDULE_TYPE,
					parameters: {
						rule: {
							interval: [
								{
									field: 'weeks',
									triggerAtHour: 9,
									triggerAtMinute: 0,
									triggerAtDayOfWeek: [1, 3, 5],
								},
							],
						},
					},
				}),
				{ now: new Date('2024-06-01T00:00:00Z'), timezone: 'UTC' },
			);
			// Next Mon/Wed/Fri at 09:00 UTC after Sat 2024-06-01 is Mon 2024-06-03
			expect(result).toBe('2024-06-03T09:00:00.000Z');
		});

		test('returns null for an invalid cron expression', () => {
			const result = deriveNextRunAt(
				node({
					type: SCHEDULE_TYPE,
					parameters: { rule: { interval: [{ field: 'cronExpression', expression: 'nope' }] } },
				}),
			);
			expect(result).toBeNull();
		});
	});

	describe('deriveSourceLabel', () => {
		test('strips a trailing "Trigger" and produces "On new <thing> message"', () => {
			expect(deriveSourceLabel('Gmail Trigger')).toBe('On new gmail message');
		});

		test('handles a multi-word service name', () => {
			expect(deriveSourceLabel('Google Sheets Trigger')).toBe('On new google sheets message');
		});

		test('does not require a trailing Trigger word', () => {
			expect(deriveSourceLabel('Webhook')).toBe('On new webhook message');
		});
	});
});
