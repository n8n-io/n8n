import {
	extractTriggerFacts,
	formatTriggersPane,
	triggerPaneClauses,
	type TriggerSourceNode,
} from '../trigger-facts';

function node(
	type: string,
	parameters: Record<string, unknown> = {},
	extra: Partial<TriggerSourceNode> = {},
): TriggerSourceNode {
	return { name: extra.name ?? type.split('.').pop() ?? type, type, parameters, ...extra };
}

function scheduleNode(intervals: Array<Record<string, unknown>>): TriggerSourceNode {
	return node('n8n-nodes-base.scheduleTrigger', { rule: { interval: intervals } });
}

function onlyFact(nodes: TriggerSourceNode[]) {
	const facts = extractTriggerFacts(nodes);
	expect(facts).toHaveLength(1);
	return facts[0];
}

describe('extractTriggerFacts', () => {
	describe('schedule trigger', () => {
		it('describes a weekly multi-day schedule with an explicit time', () => {
			const fact = onlyFact([
				scheduleNode([
					{ field: 'weeks', weeksInterval: 1, triggerAtDay: [1, 5], triggerAtHour: 9 },
				]),
			]);
			expect(fact.clause).toBe('every Monday and Friday at 09:00');
			expect(fact.exact).toBe(true);
		});

		it('omits the time when triggerAtHour is unset (runtime jitters it)', () => {
			const fact = onlyFact([scheduleNode([{ field: 'days', daysInterval: 1 }])]);
			expect(fact.clause).toBe('every day');
			expect(fact.exact).toBe(true);
		});

		it('falls back to the daily default for blank parameters', () => {
			const fact = onlyFact([node('n8n-nodes-base.scheduleTrigger')]);
			expect(fact.clause).toBe('every day');
			expect(fact.exact).toBe(true);
		});

		it.each([
			[{ field: 'minutes', minutesInterval: 1 }, 'every minute'],
			[{ field: 'minutes', minutesInterval: 15 }, 'every 15 minutes'],
			[{ field: 'seconds', secondsInterval: 30 }, 'every 30 seconds'],
			[{ field: 'hours', hoursInterval: 1 }, 'every hour'],
			[{ field: 'hours', hoursInterval: 2, triggerAtMinute: 30 }, 'every 2 hours at :30'],
			[
				{ field: 'days', daysInterval: 3, triggerAtHour: 9, triggerAtMinute: 5 },
				'every 3 days at 09:05',
			],
		])('describes interval %j as "%s"', (interval, expected) => {
			expect(onlyFact([scheduleNode([interval])]).clause).toBe(expected);
		});

		it.each([
			['an empty interval list', { rule: { interval: [] } }],
			['an unrecognized parameter shape', { scheduling: { cadence: 'daily' } }],
		])('degrades to a vague clause for %s instead of claiming the default', (_label, params) => {
			const fact = onlyFact([node('n8n-nodes-base.scheduleTrigger', params)]);
			expect(fact.clause).toBe('on a schedule');
			expect(fact.exact).toBe(false);
		});

		it('describes monthly schedules with and without an explicit day of month', () => {
			expect(
				onlyFact([
					scheduleNode([
						{ field: 'months', monthsInterval: 1, triggerAtDayOfMonth: 15, triggerAtHour: 8 },
					]),
				]).clause,
			).toBe('on day 15 of every month at 08:00');
			// Unset day-of-month is runtime-jittered — say nothing rather than invent one.
			expect(onlyFact([scheduleNode([{ field: 'months', monthsInterval: 2 }])]).clause).toBe(
				'every 2 months',
			);
		});

		it('joins multiple intervals with "and" and dedupes identical ones', () => {
			const fact = onlyFact([
				scheduleNode([
					{ field: 'minutes', minutesInterval: 15 },
					{ field: 'months', monthsInterval: 1, triggerAtDayOfMonth: 1 },
					{ field: 'minutes', minutesInterval: 15 },
				]),
			]);
			expect(fact.clause).toBe('every 15 minutes and on day 1 of every month');
		});

		it('renders cron expressions verbatim in backticks', () => {
			const fact = onlyFact([scheduleNode([{ field: 'cronExpression', expression: '0 9 * * 1' }])]);
			expect(fact.clause).toBe('on a custom schedule (`0 9 * * 1`)');
			expect(fact.exact).toBe(true);
		});

		it('degrades to a dynamic-schedule clause when a parameter is an expression', () => {
			const fact = onlyFact([
				scheduleNode([{ field: 'hours', hoursInterval: '={{ $vars.interval }}' }]),
			]);
			expect(fact.clause).toBe('on a dynamic schedule');
			expect(fact.exact).toBe(false);
		});
	});

	describe('webhook', () => {
		it('describes method and path, normalizing a leading slash', () => {
			expect(
				onlyFact([node('n8n-nodes-base.webhook', { httpMethod: 'POST', path: '/intake' })]).clause,
			).toBe('when a POST request is received at /intake');
		});

		it.each([
			['UUID default path', 'aab628da-9d99-4a1c-8b73-4a0d2b8f7de1'],
			['expression path', '={{ $vars.path }}'],
			['empty path', ''],
		])('omits the path for %s', (_label, path) => {
			expect(onlyFact([node('n8n-nodes-base.webhook', { httpMethod: 'POST', path })]).clause).toBe(
				'when a POST webhook request is received',
			);
		});

		it('joins multiple methods', () => {
			expect(
				onlyFact([node('n8n-nodes-base.webhook', { httpMethod: ['get', 'post'], path: 'hook' })])
					.clause,
			).toBe('when a GET/POST request is received at /hook');
		});
	});

	describe('form trigger', () => {
		it('quotes a literal form title', () => {
			const fact = onlyFact([node('n8n-nodes-base.formTrigger', { formTitle: 'Customer intake' })]);
			expect(fact.clause).toBe('when someone submits the "Customer intake" form');
			expect(fact.exact).toBe(true);
		});

		it('degrades to a generic clause for an expression title', () => {
			const fact = onlyFact([
				node('n8n-nodes-base.formTrigger', { formTitle: '={{ $vars.title }}' }),
			]);
			expect(fact.clause).toBe('when someone submits the form');
			expect(fact.exact).toBe(false);
		});
	});

	describe('fixed-clause triggers', () => {
		it.each([
			['n8n-nodes-base.manualTrigger', 'manually on demand'],
			['n8n-nodes-base.start', 'manually on demand'],
			['n8n-nodes-base.executeWorkflowTrigger', 'when another workflow calls it'],
			['n8n-nodes-base.errorTrigger', 'when another workflow fails'],
			['n8n-nodes-base.emailReadImap', 'when a new email arrives'],
			['@n8n/n8n-nodes-langchain.chatTrigger', 'when a chat message is received'],
			['@n8n/n8n-nodes-langchain.mcpTrigger', 'when an AI client calls it over MCP'],
		])('%s → "%s"', (type, expected) => {
			const fact = onlyFact([node(type)]);
			expect(fact.clause).toBe(expected);
			expect(fact.exact).toBe(true);
		});
	});

	describe('generic *Trigger fallback', () => {
		it('derives a spaced service label from the camelCase type id', () => {
			const fact = onlyFact([node('n8n-nodes-base.googleDriveTrigger')]);
			expect(fact.clause).toBe('on Google Drive events');
			expect(fact.exact).toBe(false);
		});

		it('humanizes a single literal event parameter', () => {
			expect(
				onlyFact([node('n8n-nodes-base.gmailTrigger', { event: 'messageReceived' })]).clause,
			).toBe('on Gmail "message received" events');
		});

		it('lists multiple literal events', () => {
			expect(
				onlyFact([
					node('n8n-nodes-base.stripeTrigger', {
						events: ['charge.succeeded', 'charge.failed'],
					}),
				]).clause,
			).toBe('on Stripe events (charge succeeded, charge failed)');
		});

		it('ignores expression-valued events', () => {
			expect(
				onlyFact([node('n8n-nodes-base.slackTrigger', { event: '={{ $vars.event }}' })]).clause,
			).toBe('on Slack events');
		});
	});

	describe('metadata provider', () => {
		const meta = (byType: Record<string, { isTrigger: boolean; displayName: string }>) => ({
			getNodeMeta: (type: string) => byType[type],
		});

		it('includes a trigger the name heuristic would miss', () => {
			const facts = extractTriggerFacts(
				[node('n8n-nodes-community.myPoller')],
				meta({ 'n8n-nodes-community.myPoller': { isTrigger: true, displayName: 'My Poller' } }),
			);
			expect(facts).toHaveLength(1);
			expect(facts[0].clause).toBe('on My Poller events');
		});

		it('excludes a *Trigger-named node the registry knows is not a trigger', () => {
			const facts = extractTriggerFacts(
				[node('n8n-nodes-community.fancyTrigger')],
				meta({ 'n8n-nodes-community.fancyTrigger': { isTrigger: false, displayName: 'Fancy' } }),
			);
			expect(facts).toHaveLength(0);
		});

		it('uses the curated display name for the generic clause', () => {
			const facts = extractTriggerFacts(
				[node('n8n-nodes-base.rssFeedReadTrigger')],
				meta({
					'n8n-nodes-base.rssFeedReadTrigger': { isTrigger: true, displayName: 'RSS Feed Trigger' },
				}),
			);
			expect(facts[0].clause).toBe('on RSS Feed events');
		});

		it('falls back to name heuristics for types the provider does not know', () => {
			const facts = extractTriggerFacts([node('n8n-nodes-base.slackTrigger')], meta({}));
			expect(facts).toHaveLength(1);
			expect(facts[0].clause).toBe('on Slack events');
		});
	});

	describe('filtering', () => {
		it('skips disabled trigger nodes', () => {
			expect(
				extractTriggerFacts([
					node('n8n-nodes-base.webhook', { httpMethod: 'POST' }, { disabled: true }),
				]),
			).toHaveLength(0);
		});

		it('ignores non-trigger nodes and returns [] for a trigger-less graph', () => {
			expect(
				extractTriggerFacts([
					node('n8n-nodes-base.set'),
					node('n8n-nodes-base.slack'),
					node('n8n-nodes-base.httpRequest'),
				]),
			).toHaveLength(0);
		});
	});

	it('describes the legacy interval node', () => {
		expect(
			onlyFact([node('n8n-nodes-base.interval', { interval: 5, unit: 'minutes' })]).clause,
		).toBe('every 5 minutes');
	});
});

describe('formatTriggersPane', () => {
	it('returns null for no facts', () => {
		expect(formatTriggersPane([])).toBeNull();
	});

	it('capitalizes a single "when" clause into a sentence', () => {
		const facts = extractTriggerFacts([
			node('n8n-nodes-base.webhook', { httpMethod: 'POST', path: 'x' }),
		]);
		expect(formatTriggersPane(facts)).toBe('When a POST request is received at /x.');
	});

	it('prefixes schedule-style clauses with "Runs"', () => {
		const facts = extractTriggerFacts([
			scheduleNode([{ field: 'days', daysInterval: 1, triggerAtHour: 9 }]),
		]);
		expect(formatTriggersPane(facts)).toBe('Runs every day at 09:00.');
	});

	it('joins two clauses with ", or"', () => {
		const facts = extractTriggerFacts([
			scheduleNode([{ field: 'weeks', weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 9 }]),
			node('n8n-nodes-base.manualTrigger'),
		]);
		expect(formatTriggersPane(facts)).toBe('Runs every Monday at 09:00, or manually on demand.');
	});

	it('joins three clauses with commas and a final ", or"', () => {
		const facts = extractTriggerFacts([
			node('n8n-nodes-base.formTrigger', { formTitle: 'Intake' }),
			node('@n8n/n8n-nodes-langchain.chatTrigger'),
			node('n8n-nodes-base.manualTrigger'),
		]);
		expect(formatTriggersPane(facts)).toBe(
			'When someone submits the "Intake" form, when a chat message is received, or manually on demand.',
		);
	});

	it('dedupes identical clauses from duplicate trigger nodes', () => {
		const facts = extractTriggerFacts([
			node('n8n-nodes-base.manualTrigger', {}, { name: 'Manual 1' }),
			node('n8n-nodes-base.manualTrigger', {}, { name: 'Manual 2' }),
		]);
		expect(formatTriggersPane(facts)).toBe('Runs manually on demand.');
	});
});

describe('triggerPaneClauses', () => {
	it('returns unique clauses in canvas order', () => {
		const facts = extractTriggerFacts([
			node('n8n-nodes-base.webhook', { httpMethod: 'POST', path: 'x' }),
			node('n8n-nodes-base.manualTrigger', {}, { name: 'Manual 1' }),
			node('n8n-nodes-base.manualTrigger', {}, { name: 'Manual 2' }),
		]);
		expect(triggerPaneClauses(facts)).toEqual([
			'when a POST request is received at /x',
			'manually on demand',
		]);
	});
});
