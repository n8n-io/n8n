import type { INode } from 'n8n-workflow';

import { normalizeFormTriggerContent } from '../form-trigger-content';

const NOW = new Date('2026-10-21T08:00:00.000Z');
const FORM_FIELDS_ADDED = { submittedAt: NOW.toISOString(), formMode: 'production' };

function formNode(fields: Array<Record<string, unknown>>, overrides: Partial<INode> = {}): INode {
	return {
		id: 'form-1',
		name: 'Feedback Form',
		type: 'n8n-nodes-base.formTrigger',
		typeVersion: 2.6,
		position: [0, 0],
		parameters: { formFields: { values: fields } },
		...overrides,
	} as INode;
}

const FEEDBACK_FIELDS = [
	{ fieldLabel: 'Name', fieldName: 'name', fieldType: 'text' },
	{ fieldLabel: 'Comments', fieldName: 'comments', fieldType: 'textarea' },
];

describe('normalizeFormTriggerContent', () => {
	it('returns the content of other trigger types unchanged', () => {
		const content = { headers: {}, query: {}, body: { email: 'jane@example.com' } };
		const webhook = formNode([], { type: 'n8n-nodes-base.webhook', typeVersion: 2 });

		expect(normalizeFormTriggerContent(webhook, content, NOW)).toBe(content);
	});

	describe('webhook envelope', () => {
		it('lifts the fields out of the body and adds the Form Trigger fields', () => {
			const content = {
				headers: {},
				query: {},
				body: { name: 'Alice', comments: 'Love the new dashboard' },
			};

			expect(normalizeFormTriggerContent(formNode(FEEDBACK_FIELDS), content, NOW)).toEqual({
				name: 'Alice',
				comments: 'Love the new dashboard',
				...FORM_FIELDS_ADDED,
			});
		});

		it('turns an empty envelope into an empty submission', () => {
			const content = { headers: {}, query: {}, body: {} };

			expect(normalizeFormTriggerContent(formNode(FEEDBACK_FIELDS), content, NOW)).toEqual({
				name: null,
				comments: null,
				...FORM_FIELDS_ADDED,
			});
		});

		it('moves a binary map to the top level from inside or beside the body', () => {
			const binary = { CV_0: { mimeType: 'application/pdf', fileName: 'cv.pdf' } };
			const node = formNode([{ fieldLabel: 'CV', fieldType: 'file' }]);

			expect(normalizeFormTriggerContent(node, { body: { binary } }, NOW)).toEqual({
				binary,
				CV: null,
				...FORM_FIELDS_ADDED,
			});
			expect(normalizeFormTriggerContent(node, { body: {}, binary }, NOW)).toEqual({
				binary,
				CV: null,
				...FORM_FIELDS_ADDED,
			});
		});

		it('keeps the headers only when the node is set to show them', () => {
			const content = { headers: { 'user-agent': 'test' }, body: { name: 'Alice' } };
			const showing = formNode(FEEDBACK_FIELDS, {
				parameters: { formFields: { values: FEEDBACK_FIELDS }, options: { showHeaders: true } },
			});

			expect(normalizeFormTriggerContent(formNode(FEEDBACK_FIELDS), content, NOW)).toEqual({
				name: 'Alice',
				comments: null,
				...FORM_FIELDS_ADDED,
			});
			expect(normalizeFormTriggerContent(showing, content, NOW)).toEqual({
				name: 'Alice',
				comments: null,
				headers: { 'user-agent': 'test' },
				...FORM_FIELDS_ADDED,
			});
		});

		it('passes a non-empty query on as formQueryParameters', () => {
			const content = { headers: {}, query: { ref: 'newsletter' }, body: { name: 'Alice' } };

			expect(normalizeFormTriggerContent(formNode(FEEDBACK_FIELDS), content, NOW)).toEqual({
				name: 'Alice',
				comments: null,
				formQueryParameters: { ref: 'newsletter' },
				...FORM_FIELDS_ADDED,
			});
		});

		it('lifts the fields out of the body when Form Trigger keys sit next to it', () => {
			// Seen in a replay: the mock model added submittedAt and formMode to the envelope.
			const content = {
				headers: {},
				query: {},
				body: { name: 'Alice', comments: 'Love the new dashboard' },
				submittedAt: '2026-07-13T09:00:00.000Z',
				formMode: 'test',
			};

			expect(normalizeFormTriggerContent(formNode(FEEDBACK_FIELDS), content, NOW)).toEqual({
				name: 'Alice',
				comments: 'Love the new dashboard',
				submittedAt: '2026-07-13T09:00:00.000Z',
				formMode: 'test',
			});
		});

		it('leaves the body in place when other keys sit next to it', () => {
			const content = { body: { text: 'hi' }, name: 'Alice' };

			expect(normalizeFormTriggerContent(formNode(FEEDBACK_FIELDS), content, NOW)).toEqual({
				...content,
				comments: null,
				...FORM_FIELDS_ADDED,
			});
		});

		it('leaves the body in place when a form field is called body', () => {
			const node = formNode([{ fieldLabel: 'Body', fieldName: 'body', fieldType: 'textarea' }]);
			const content = { headers: {}, body: { text: 'hi' } };

			expect(normalizeFormTriggerContent(node, content, NOW)).toEqual({
				...content,
				...FORM_FIELDS_ADDED,
			});
		});
	});

	describe('flat content', () => {
		it('adds submittedAt and formMode only when they are missing', () => {
			const content = {
				name: 'Alice',
				comments: 'Great',
				submittedAt: '2026-10-20T10:00:00.000Z',
				formMode: 'test',
			};

			expect(normalizeFormTriggerContent(formNode(FEEDBACK_FIELDS), content, NOW)).toEqual(content);
		});
	});

	describe('missing fields', () => {
		it('sets every declared field that is missing to null, as the Form Trigger does', () => {
			const node = formNode([
				{ fieldLabel: 'Name', fieldName: 'name', fieldType: 'text' },
				{ fieldLabel: 'Comments', fieldName: 'comments', fieldType: 'textarea' },
				{ fieldLabel: 'Rating', fieldName: 'rating', fieldType: 'number' },
				{ fieldType: 'html', elementName: 'intro', html: '<p>Hi</p>' },
			]);

			expect(normalizeFormTriggerContent(node, { Name: 'Alice' }, NOW)).toEqual({
				name: 'Alice',
				comments: null,
				rating: null,
				...FORM_FIELDS_ADDED,
			});
		});
	});

	describe('field keys', () => {
		it('renames a key to the field name the node emits', () => {
			const content = { Name: 'Alice', Comments: 'Love the new dashboard' };

			expect(normalizeFormTriggerContent(formNode(FEEDBACK_FIELDS), content, NOW)).toEqual({
				name: 'Alice',
				comments: 'Love the new dashboard',
				...FORM_FIELDS_ADDED,
			});
		});

		it('renames a key to the field label when the field has no name', () => {
			const node = formNode([{ fieldLabel: 'Customer ID', fieldType: 'text' }]);

			expect(normalizeFormTriggerContent(node, { customer_id: 'CUST-4821' }, NOW)).toEqual({
				'Customer ID': 'CUST-4821',
				...FORM_FIELDS_ADDED,
			});
		});

		it('renames a key that differs from the label only in punctuation', () => {
			const node = formNode([{ fieldLabel: 'Customer (ID)', fieldType: 'text' }]);

			expect(normalizeFormTriggerContent(node, { 'Customer ID': 'CUST-4821' }, NOW)).toEqual({
				'Customer (ID)': 'CUST-4821',
				...FORM_FIELDS_ADDED,
			});
		});

		it('renames to the field label before typeVersion 2.4', () => {
			const node = formNode(
				[{ fieldLabel: 'Full Name', fieldName: 'fullName', fieldType: 'text' }],
				{
					typeVersion: 2.2,
				},
			);

			expect(normalizeFormTriggerContent(node, { fullName: 'Ada Lovelace' }, NOW)).toEqual({
				'Full Name': 'Ada Lovelace',
				...FORM_FIELDS_ADDED,
			});
		});

		it('leaves a key that matches more than one field', () => {
			const node = formNode([
				{ fieldLabel: 'E-mail', fieldType: 'email' },
				{ fieldLabel: 'Email', fieldType: 'email' },
			]);

			expect(normalizeFormTriggerContent(node, { email: 'jane@example.com' }, NOW)).toEqual({
				email: 'jane@example.com',
				'E-mail': null,
				Email: null,
				...FORM_FIELDS_ADDED,
			});
		});

		it('leaves keys that map to the same field, or to a field already present', () => {
			const node = formNode(FEEDBACK_FIELDS);

			expect(normalizeFormTriggerContent(node, { Name: 'Alice', NAME: 'Bob' }, NOW)).toEqual({
				Name: 'Alice',
				NAME: 'Bob',
				name: null,
				comments: null,
				...FORM_FIELDS_ADDED,
			});
			expect(normalizeFormTriggerContent(node, { name: 'Alice', Name: 'Bob' }, NOW)).toEqual({
				name: 'Alice',
				Name: 'Bob',
				comments: null,
				...FORM_FIELDS_ADDED,
			});
		});

		it('leaves keys that match no field', () => {
			const node = formNode([{ fieldLabel: 'Customer ID', fieldType: 'text' }]);

			expect(
				normalizeFormTriggerContent(node, { 'Customer ID': 'CUST-4821', message: 'Hi' }, NOW),
			).toEqual({ 'Customer ID': 'CUST-4821', message: 'Hi', ...FORM_FIELDS_ADDED });
		});
	});
});
