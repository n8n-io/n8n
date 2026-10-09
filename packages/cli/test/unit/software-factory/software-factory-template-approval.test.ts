import { isRecord } from '@n8n/utils/is-record';
import Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { IDataObject, IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
// n8n-nodes-base has no public export of this helper. The import follows the source file of the
// Slack node, and its built type declarations link it to the code, so a rename breaks this test.
import { createSendAndWaitMessageBody } from 'n8n-nodes-base/dist/nodes/Slack/V2/GenericFunctions';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { nodeByName } from './factory-pack-files';
import {
	configured,
	earlierNodes,
	parameterOf,
	textOf,
	ticketOutput,
	workflow,
} from './factory-pack-fixtures';
import type { TemplateRun } from './factory-pack-runtime';

/**
 * The plan approval of the template: the Slack message and the review page. The Slack message
 * goes through the send-and-wait code of the Slack node, which decodes HTML entities once.
 */

const APPROVAL = 'Ask for plan approval';
const FORM_TEMPLATE = path.resolve(__dirname, '../../../templates/form-trigger.handlebars');

/**
 * The context that the Slack node gets for the approval: each parameter with its expressions
 * evaluated, as the workflow engine gives them to the node.
 */
function slackContextOf(run: TemplateRun): IExecuteFunctions {
	const parameters: unknown = configured.parametersOf(APPROVAL);
	const parameterNamed = (name: string): unknown =>
		name
			.split('.')
			.reduce<unknown>((value, key) => (isRecord(value) ? value[key] : undefined), parameters);

	const context = mock<IExecuteFunctions>({
		getNode: () => mock<INode>({ typeVersion: nodeByName(workflow, APPROVAL).typeVersion }),
		getExecutionId: () => '1',
		getSignedResumeUrl: () => 'https://n8n.example.com/resume',
	});
	context.getNodeParameter.mockImplementation((name, _itemIndex, fallback, options) => {
		const raw = parameterNamed(name);
		if (raw === undefined) return fallback;
		const value = configured.evaluate(APPROVAL, raw, run);
		const extracted = options?.extractValue && isRecord(value) ? value.value : value;
		return extracted as NodeParameterValueType;
	});
	return context;
}

/** The text of the plan section that Slack receives for the approval message. */
function sentTextOf(run: TemplateRun): string {
	const section = createSendAndWaitMessageBody(slackContextOf(run)).blocks[1];
	if (section?.type !== 'section') throw new Error('The Slack message has no text section');
	return section.text.text;
}

/** The page of the form template that shows the description, rendered with the description. */
function reviewPageOf(description: string): string {
	const line = readFileSync(FORM_TEMPLATE, 'utf8')
		.split('\n')
		.find((candidate) => candidate.includes('{{{formDescription}}}'));
	if (line === undefined) throw new Error('The form template shows no description');
	return Handlebars.compile(line)({ formDescription: description });
}

/** The text that a browser shows for escaped HTML text: each entity back to its character. */
const HTML_TEXT_ENTITIES: Partial<Record<string, string>> = { amp: '&', lt: '<', gt: '>' };
const shownText = (html: string) =>
	html.replace(/&(amp|lt|gt);/g, (entity, name: string) => HTML_TEXT_ENTITIES[name] ?? entity);

describe('plan approval', () => {
	const planRun = (structuredOutput: IDataObject, ticket: IDataObject = ticketOutput) => ({
		json: { structuredOutput },
		nodes: { ...earlierNodes, 'Read factory ticket': ticket },
	});
	const longPlan = {
		summary: `${'Summary text. '.repeat(400)} <b> & more`,
		steps: Array.from({ length: 60 }, (_, index) => `Step ${index}: ${'x'.repeat(300)} & <tag>`),
		files: Array.from({ length: 60 }, (_, index) => `src/file-${index}.ts`),
		tests: Array.from({ length: 40 }, (_, index) => `test ${index}`),
		risks: ['r'.repeat(900)],
		estimatedChangedLines: 50000,
	};
	const hugeTicket = {
		...ticketOutput,
		ticket: 'ENG-'.repeat(200),
		title: 'T'.repeat(5000),
		url: `https://linear.app/acme/issue/${'u'.repeat(5000)}`,
	};

	const descriptionOf = (plan: IDataObject, ticket: IDataObject = ticketOutput) => {
		const form = z
			.object({ responseFormDescription: z.string() })
			.parse(parameterOf(APPROVAL, 'options')).responseFormDescription;
		return textOf(APPROVAL, form, planRun(plan, ticket));
	};

	it('keeps the Slack message of a maximal plan within the 3000 characters of one section', () => {
		const text = sentTextOf(planRun(longPlan, hugeTicket));

		expect(text.length).toBeLessThanOrEqual(3000);
		expect(text).toContain('review the plan for ENG-');
	});

	it('keeps the Slack message within 3000 characters when every character is escaped', () => {
		const plan = { ...longPlan, summary: '<'.repeat(5000) };
		const ticket = { ...hugeTicket, title: '&'.repeat(5000), url: '<'.repeat(5000) };

		expect(sentTextOf(planRun(plan, ticket)).length).toBeLessThanOrEqual(3000);
	});

	it('shows the markup of the plan and the ticket as text, so that Slack shows no mention or link', () => {
		const plan = { ...longPlan, summary: 'Stop <!channel> & <https://evil.example|click>.' };
		const ticket = { ...ticketOutput, title: 'Fix <b> & "x"' };
		const text = sentTextOf(planRun(plan, ticket));

		expect(text).toContain('Stop &lt;!channel&gt; &amp; &lt;https://evil.example|click&gt;.');
		expect(text).toContain('Fix &lt;b&gt; &amp; "x"');
		expect(text).not.toMatch(/[<>]/);
		expect(text).not.toContain('<!channel>');
		expect(text).not.toContain('<https://evil.example|click>');
	});

	it('shows an entity that the ticket holds as the same text', () => {
		const text = sentTextOf(planRun(longPlan, { ...ticketOutput, title: 'Show &lt;b&gt; &amp;' }));

		expect(text).toContain('Show &amp;lt;b&amp;gt; &amp;amp;');
	});

	it('cuts the escaped text at the limit and never leaves a part of an entity', () => {
		const text = sentTextOf(planRun({ ...longPlan, summary: '<'.repeat(1200) }));

		expect(text).toContain(`${'&lt;'.repeat(250)}...`);
		expect(text).not.toMatch(/&(?!amp;|lt;|gt;)/);
	});

	it('counts an escaped ampersand as the five characters that Slack shows', () => {
		const text = sentTextOf(planRun({ ...longPlan, summary: '&'.repeat(400) }));

		// The summary has 1000 characters, so 200 ampersands fit: each is "&amp;" in the text.
		expect(text).toContain(`${'&amp;'.repeat(200)}...`);
		expect(text).not.toContain('&amp;'.repeat(201));
	});

	it('states the counts and the estimate, and leaves the steps to the review page', () => {
		const text = sentTextOf(planRun(longPlan));

		expect(text).toContain('*Steps*: 60. *Files*: 60. *Tests*: 40. *Risks*: 1.');
		expect(text).toContain('*Estimated changed lines*: 50000 of 100.');
		expect(text).toContain('Choose "Review the plan" to read it.');
		expect(text).not.toContain('Step 0:');
	});

	it('shows every step, file, test and risk on the review page', () => {
		const shown = shownText(descriptionOf(longPlan)).split('\n');
		const numbered = shown.filter((line) => /^\d+\. Step \d+:/.test(line));

		expect(shown[0]).toBe('Approve the plan, ask for changes or reject the ticket.');
		expect(shown).toContain(`Summary: ${'Summary text. '.repeat(400)} <b> & more`);
		expect(numbered).toHaveLength(60);
		expect(numbered[59]).toBe(`60. Step 59: ${'x'.repeat(300)} & <tag>`);
		expect(shown).toContain('Tests:');
		expect(shown).toContain('- test 0');
		expect(shown).toContain(`Risks: ${'r'.repeat(900)}`);
		expect(shown).toContain('Estimated changed lines: 50000 of 100.');
	});

	it('keeps the markup of the plan as text on the review page', () => {
		const markupPlan = {
			summary: 'Show the count in <script setup>.',
			steps: [
				'Add a runCount prop of type Map<string, number> to WorkflowCard.vue.',
				'Render the count in the <template> of WorkflowCard.vue.',
				'Keep <img src=x onerror="alert(1)"> out of the page.',
				'Keep this step visible.',
			],
			files: ['src/WorkflowCard.vue'],
			tests: ['WorkflowCard shows 0 for <none>'],
			risks: ['A > B'],
			estimatedChangedLines: 60,
		};
		const description = descriptionOf(markupPlan);
		const page = reviewPageOf(description);

		expect(description).not.toMatch(/[<>]/);
		// The page adds no element for the plan: only the paragraph that holds the description.
		expect(page.match(/<\/?[a-zA-Z][^>]*>/g)).toEqual([
			'<p style="white-space: pre-line">',
			'</p>',
		]);
		// The page shows the whole description as text, and each line of it is a line of the plan.
		expect(shownText(page)).toContain(shownText(description));
		expect(shownText(description).split('\n')).toEqual(
			expect.arrayContaining([
				'1. Add a runCount prop of type Map<string, number> to WorkflowCard.vue.',
				'2. Render the count in the <template> of WorkflowCard.vue.',
				'3. Keep <img src=x onerror="alert(1)"> out of the page.',
				'4. Keep this step visible.',
				'Tests:',
				'- WorkflowCard shows 0 for <none>',
				'Risks: A > B',
				'Estimated changed lines: 60 of 100.',
			]),
		);
	});

	it('says "none" for the risks of a plan without risks', () => {
		const form = z
			.object({ responseFormDescription: z.string() })
			.parse(parameterOf(APPROVAL, 'options')).responseFormDescription;
		const text = textOf(APPROVAL, form, planRun({ ...longPlan, risks: [] }));

		expect(text).toContain('\nRisks: none\n');
	});
});
