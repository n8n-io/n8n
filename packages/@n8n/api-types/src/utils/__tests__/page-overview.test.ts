import {
	WORKFLOW_TRIGGER_CATEGORIES,
	isTriggerNodeType,
	toPageExcerpt,
	toTriggerCategory,
	toWorkflowTrigger,
} from '../page-overview';

describe('toTriggerCategory', () => {
	it.each([
		['n8n-nodes-base.scheduleTrigger', 'schedule'],
		['n8n-nodes-base.cron', 'schedule'],
		['n8n-nodes-base.interval', 'schedule'],
		['n8n-nodes-base.webhook', 'webhook'],
		['n8n-nodes-base.formTrigger', 'form'],
		['@n8n/n8n-nodes-langchain.chatTrigger', 'chat'],
		['n8n-nodes-base.slackTrigger', 'appEvent'],
		['n8n-nodes-base.executeWorkflowTrigger', 'subWorkflow'],
		['n8n-nodes-base.manualTrigger', 'manual'],
	])('should read %s as %s', (nodeType, category) => {
		expect(toTriggerCategory(['n8n-nodes-base.set', nodeType])).toBe(category);
	});

	it('should read a workflow with no trigger as manual', () => {
		expect(toTriggerCategory([])).toBe('manual');
		expect(toTriggerCategory(['n8n-nodes-base.set', 'n8n-nodes-base.respondToWebhook'])).toBe(
			'manual',
		);
	});

	it('should take the first category of the fixed order when a workflow has several triggers', () => {
		expect(
			toTriggerCategory([
				'n8n-nodes-base.manualTrigger',
				'n8n-nodes-base.slackTrigger',
				'n8n-nodes-base.webhook',
			]),
		).toBe('webhook');
		expect(
			toTriggerCategory(['n8n-nodes-base.executeWorkflowTrigger', 'n8n-nodes-base.slackTrigger']),
		).toBe('appEvent');
	});

	it('should export the categories in their priority order', () => {
		expect(WORKFLOW_TRIGGER_CATEGORIES).toEqual([
			'schedule',
			'webhook',
			'form',
			'chat',
			'appEvent',
			'subWorkflow',
			'manual',
		]);
	});
});

describe('isTriggerNodeType', () => {
	it('should tell a trigger from another node', () => {
		expect(isTriggerNodeType('n8n-nodes-base.webhook')).toBe(true);
		expect(isTriggerNodeType('n8n-nodes-base.manualTrigger')).toBe(true);
		expect(isTriggerNodeType('n8n-nodes-base.slack')).toBe(false);
		expect(isTriggerNodeType('n8n-nodes-base.toString')).toBe(false);
	});
});

describe('toPageExcerpt', () => {
	it('should give the plain text of the first paragraph that is not a heading', () => {
		const markdown = [
			'# Order sync',
			'',
			'## Summary',
			'',
			'This **workflow** copies the orders to the [CRM](/workflow/w1) with `Set`',
			'and tells the _team_.',
			'',
			'A second paragraph.',
		].join('\n');

		expect(toPageExcerpt(markdown, 200)).toBe(
			'This workflow copies the orders to the CRM with Set and tells the team.',
		);
	});

	it('should skip code blocks, table rows and rules', () => {
		const markdown = ['```', 'const a = 1;', '```', '', '| a | b |', '', '---', '', 'Text.'].join(
			'\n',
		);

		expect(toPageExcerpt(markdown, 200)).toBe('Text.');
	});

	it('should read a list item without its marker', () => {
		expect(toPageExcerpt('# Steps\n\n- [ ] Check the orders', 200)).toBe('Check the orders');
	});

	it('should cut a long paragraph at a word boundary and end it with an ellipsis', () => {
		expect(toPageExcerpt('The quick brown fox jumps over the lazy dog.', 20)).toBe(
			'The quick brown fox…',
		);
		expect(toPageExcerpt('The quick brown, fox', 17)).toBe('The quick brown…');
	});

	it('should keep a paragraph that fits', () => {
		expect(toPageExcerpt('Short text.', 11)).toBe('Short text.');
	});

	it('should cut inside a word that is longer than the limit', () => {
		expect(toPageExcerpt('Supercalifragilistic', 6)).toBe('Super…');
	});

	it('should give an empty text for a page with no paragraph', () => {
		expect(toPageExcerpt('', 50)).toBe('');
		expect(toPageExcerpt('# Only a title', 50)).toBe('');
	});

	it.each([0, -1, 1.5, Number.NaN])('should reject %s as the maximum length', (maxLength) => {
		expect(() => toPageExcerpt('Text', maxLength)).toThrow(RangeError);
	});
});

describe('toWorkflowTrigger', () => {
	const webhook = (parameters: unknown) => [{ type: 'n8n-nodes-base.webhook', parameters }];
	const schedule = (rule: unknown) => [
		{ type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: { interval: [rule] } } },
	];
	const slack = (parameters: unknown) => [{ type: 'n8n-nodes-base.slackTrigger', parameters }];

	it('should read the method and the path of a webhook', () => {
		expect(toWorkflowTrigger(webhook({ httpMethod: 'POST', path: 'acme/orders' }))).toEqual({
			kind: 'webhook',
			method: 'POST',
			path: 'acme/orders',
		});
	});

	it('should use the default method of a webhook that stores none', () => {
		expect(toWorkflowTrigger(webhook({ path: 'orders' }))).toEqual({
			kind: 'webhook',
			method: 'GET',
			path: 'orders',
		});
	});

	it('should join the methods of a webhook that accepts several', () => {
		expect(toWorkflowTrigger(webhook({ httpMethod: ['GET', 'POST'], path: 'orders' }))).toEqual({
			kind: 'webhook',
			method: 'GET, POST',
			path: 'orders',
		});
	});

	it.each([
		['an expression path', { httpMethod: 'POST', path: '={{ $json.path }}' }],
		['an expression method', { httpMethod: '={{ $json.method }}', path: 'orders' }],
		['no path', { httpMethod: 'POST' }],
		['a path that is not a text', { path: { nested: true } }],
		['a method that is not a text', { httpMethod: 5, path: 'orders' }],
		['parameters that are not an object', 'text'],
		['no parameters', undefined],
	])('should give no fact for a webhook with %s', (_case, parameters) => {
		expect(toWorkflowTrigger(webhook(parameters))).toBeUndefined();
	});

	it('should read a daily rule with its time', () => {
		expect(toWorkflowTrigger(schedule({ field: 'days', triggerAtHour: 2 }))).toEqual({
			kind: 'schedule',
			field: 'days',
			triggerAtHour: 2,
		});
	});

	it('should read a rule without a unit as a daily rule', () => {
		expect(toWorkflowTrigger(schedule({}))).toEqual({ kind: 'schedule', field: 'days' });
	});

	it('should read a weekly rule, a minutes rule, an hours rule and a cron rule', () => {
		expect(
			toWorkflowTrigger(
				schedule({ field: 'weeks', triggerAtDay: [1], triggerAtHour: 8, triggerAtMinute: 30 }),
			),
		).toEqual({
			kind: 'schedule',
			field: 'weeks',
			triggerAtDay: [1],
			triggerAtHour: 8,
			triggerAtMinute: 30,
		});
		expect(toWorkflowTrigger(schedule({ field: 'minutes', minutesInterval: 5 }))).toEqual({
			kind: 'schedule',
			field: 'minutes',
			minutesInterval: 5,
		});
		expect(toWorkflowTrigger(schedule({ field: 'hours', hoursInterval: 2 }))).toEqual({
			kind: 'schedule',
			field: 'hours',
			hoursInterval: 2,
		});
		expect(
			toWorkflowTrigger(schedule({ field: 'cronExpression', expression: '0 9 * * 1-5' })),
		).toEqual({ kind: 'schedule', field: 'cronExpression', expression: '0 9 * * 1-5' });
	});

	it('should leave out the values of a rule that have a wrong type', () => {
		expect(
			toWorkflowTrigger(
				schedule({
					field: 'days',
					triggerAtHour: '2',
					triggerAtMinute: 1.5,
					triggerAtDay: ['monday'],
					expression: '={{ $json.cron }}',
				}),
			),
		).toEqual({ kind: 'schedule', field: 'days' });
	});

	it.each([
		['a unit that the fact cannot describe', { field: 'months' }],
		['a rule that skips days', { field: 'days', daysInterval: 3 }],
		['a rule that skips weeks', { field: 'weeks', weeksInterval: 2 }],
		['a unit that is not a text', { field: 7 }],
		['a rule that is not an object', 'daily'],
	])('should give no fact for a schedule with %s', (_case, rule) => {
		expect(toWorkflowTrigger(schedule(rule))).toBeUndefined();
	});

	it('should give no fact for a schedule without rules and for the legacy schedule nodes', () => {
		expect(
			toWorkflowTrigger([{ type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: 5 } }]),
		).toBeUndefined();
		expect(
			toWorkflowTrigger([{ type: 'n8n-nodes-base.cron', parameters: { path: 'x' } }]),
		).toBeUndefined();
	});

	it('should read the title of a form', () => {
		expect(
			toWorkflowTrigger([
				{ type: 'n8n-nodes-base.formTrigger', parameters: { formTitle: 'Contact us' } },
			]),
		).toEqual({ kind: 'form', title: 'Contact us' });
		expect(
			toWorkflowTrigger([{ type: 'n8n-nodes-base.formTrigger', parameters: { formTitle: '' } }]),
		).toBeUndefined();
	});

	it('should read at most 3 fixed events of an app trigger', () => {
		expect(toWorkflowTrigger(slack({ events: ['a', '={{ $json.b }}', 'c', 4, 'd', 'e'] }))).toEqual(
			{ kind: 'appEvent', events: ['a', 'c', 'd'] },
		);
		expect(toWorkflowTrigger(slack({ event: 'message' }))).toEqual({
			kind: 'appEvent',
			events: ['message'],
		});
		expect(toWorkflowTrigger(slack({ events: { all: true } }))).toBeUndefined();
		expect(toWorkflowTrigger(slack({}))).toBeUndefined();
	});

	it('should read the first trigger of the category of the workflow', () => {
		expect(
			toWorkflowTrigger([
				{ type: 'n8n-nodes-base.slackTrigger', parameters: { event: 'message' } },
				{ type: 'n8n-nodes-base.set', parameters: { path: 'not-a-trigger' } },
				{ type: 'n8n-nodes-base.webhook', parameters: { path: 'first' } },
				{ type: 'n8n-nodes-base.webhook', parameters: { path: 'second' } },
			]),
		).toEqual({ kind: 'webhook', method: 'GET', path: 'first' });
	});

	it('should give no fact for the categories that have none', () => {
		expect(toWorkflowTrigger([])).toBeUndefined();
		expect(toWorkflowTrigger([{ type: 'n8n-nodes-base.manualTrigger' }])).toBeUndefined();
		expect(
			toWorkflowTrigger([{ type: '@n8n/n8n-nodes-langchain.chatTrigger', parameters: {} }]),
		).toBeUndefined();
	});
});
