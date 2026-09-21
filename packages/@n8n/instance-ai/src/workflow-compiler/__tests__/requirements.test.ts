import { describe, expect, it } from 'vitest';

import { NodeRegistry } from '../catalog/node-registry';
import { buildClarificationQuestions } from '../requirements/clarification';
import {
	missingBehaviorRequirements,
	missingOperationRequirements,
} from '../requirements/completeness';
import { extractRequirements, splitActionPhrases } from '../requirements/extract';

const REQUEST = [
	'Create an API workflow.',
	'POST /customers',
	'Validate email and company.',
	'Upsert the customer in HubSpot.',
	'If they are new, send a message to #sales.',
	'Also save every request in Postgres table customer_requests.',
	'Respond with the HubSpot contact ID.',
].join('\n');

describe('extractRequirements', () => {
	const requirements = extractRequirements(REQUEST);

	it('reads intent, trigger and endpoint from the text', () => {
		expect(requirements.intent).toEqual({ status: 'resolved', value: 'create', source: 'user' });
		expect(requirements.trigger).toEqual({ status: 'resolved', value: 'webhook', source: 'user' });
		expect(requirements.triggerParams.method).toEqual({
			status: 'resolved',
			value: 'POST',
			source: 'user',
		});
		expect(requirements.triggerParams.path).toEqual({
			status: 'resolved',
			value: '/customers',
			source: 'user',
		});
	});

	it('records validation, response and actions with integration hints', () => {
		expect(requirements.emailFields).toEqual(['email']);
		expect(requirements.requiredFields).toEqual(['company']);
		expect(requirements.respond).toEqual({ status: 'resolved', value: true, source: 'user' });
		expect(requirements.responseFields).toEqual(['HubSpot contact ID']);
		expect(requirements.actions.map((action) => action.integration)).toEqual([
			'hubspot',
			'slack',
			'postgres',
		]);
		expect(requirements.actions[1]).toMatchObject({
			params: { channel: '#sales' },
			conditional: 'they are new',
		});
		expect(requirements.actions[2]).toMatchObject({ params: { table: 'customer_requests' } });
		expect(requirements.workflowName).toEqual({
			status: 'resolved',
			value: 'Customers API',
			source: 'default',
		});
	});

	it('marks unknown trigger details as missing instead of guessing', () => {
		const vague = extractRequirements('Send a Slack message to #ops when something happens');
		expect(vague.trigger.status).toBe('missing');
		expect(missingBehaviorRequirements(vague).map((issue) => issue.field)).toEqual([
			'intent',
			'trigger',
		]);
	});

	it('detects schedules', () => {
		const nightly = extractRequirements(
			'Every night, find stalled orders in Postgres and alert #ops in Slack',
		);
		expect(nightly.trigger).toEqual({ status: 'resolved', value: 'schedule', source: 'user' });
		expect(nightly.triggerParams.cron).toMatchObject({ status: 'resolved', value: '0 2 * * *' });
	});
});

describe('completeness', () => {
	it('reports operation-level requirements after selection', () => {
		const requirements = extractRequirements(
			'When a POST /leads arrives, notify the sales team in Slack',
		);
		requirements.actions[0].operationId = 'slack.message.post';
		const issues = missingOperationRequirements(requirements, new NodeRegistry());
		expect(issues).toEqual([
			expect.objectContaining({ field: `actions.${requirements.actions[0].id}.channel` }),
		]);
		expect(buildClarificationQuestions(issues)[0].question).toBe(
			'Which Slack channel should receive the message?',
		);
	});

	it('groups several unresolved trigger values into one question', () => {
		const requirements = extractRequirements(
			'Build a webhook that stores orders in Postgres table orders',
		);
		const questions = buildClarificationQuestions(missingBehaviorRequirements(requirements));
		expect(questions).toHaveLength(1);
		expect(questions[0].fields).toEqual(['triggerParams.method', 'triggerParams.path']);
		expect(questions[0].question).toMatch(/method.*path/i);
	});
});

describe('splitActionPhrases', () => {
	it('splits sentences and clauses', () => {
		expect(
			splitActionPhrases(
				'Validate it, enrich it, and then notify Slack. Store a copy in Postgres.',
			),
		).toEqual(['Validate it', 'enrich it', 'notify Slack.', 'Store a copy in Postgres.']);
	});
});
