import { validate } from '@n8n/node-sdk';

import { issueOf, issuesPath } from '../nodes/github/issue';
import { documentIdOf, documentPath } from '../nodes/google-docs/google-docs.node';
import { markdownRequests } from '../nodes/google-docs/markdown';
import { driveIdOf } from '../nodes/google-drive/google-drive.node';
import { filterQuery, rowFilter } from '../nodes/supabase/filter';

describe('google-docs markdownRequests', () => {
	it('inserts the text once and styles headings, lists, bold and links by UTF-16 index', () => {
		const requests = markdownRequests(
			'# Guide 🚀\n\nIntro with **bold** and [docs](https://example.com).\n\n- one\n- two\n1. first\n\nuser_id stays',
			1,
		);
		expect(requests).toEqual([
			{
				insertText: {
					location: { index: 1 },
					text: 'Guide 🚀\nIntro with bold and docs.\none\ntwo\nfirst\nuser_id stays',
				},
			},
			{
				updateParagraphStyle: {
					range: { startIndex: 1, endIndex: 10 },
					paragraphStyle: { namedStyleType: 'HEADING_1' },
					fields: 'namedStyleType',
				},
			},
			{
				updateTextStyle: {
					range: { startIndex: 21, endIndex: 25 },
					textStyle: { bold: true },
					fields: 'bold',
				},
			},
			{
				updateTextStyle: {
					range: { startIndex: 30, endIndex: 34 },
					textStyle: { link: { url: 'https://example.com' } },
					fields: 'link',
				},
			},
			{
				createParagraphBullets: {
					range: { startIndex: 36, endIndex: 44 },
					bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
				},
			},
			{
				createParagraphBullets: {
					range: { startIndex: 44, endIndex: 50 },
					bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
				},
			},
		]);
	});

	it('keeps a link with a scheme other than http, https or mailto as text', () => {
		expect(markdownRequests('[run](javascript:alert)', 1)).toEqual([
			{ insertText: { location: { index: 1 }, text: 'run' } },
		]);
		expect(markdownRequests('\n\n', 1)).toEqual([]);
	});
});

describe('supabase filterQuery', () => {
	it('groups every condition in one and/or term, also two on one column', () => {
		expect(
			filterQuery({
				match: 'all',
				conditions: [
					{ op: 'eq', column: 'status', value: 'churned' },
					{ op: 'gt', column: 'age', value: 10 },
					{ op: 'lt', column: 'age', value: 20 },
					{ op: 'in', column: 'id', values: [1, 'a,b'] },
					{ op: 'ilike', column: 'email', pattern: '*@example.com' },
					{ op: 'fullText', column: 'bio', query: 'cat', function: 'wfts' },
				],
			}),
		).toEqual({
			and: '(status.eq.churned,age.gt.10,age.lt.20,id.in.(1,"a,b"),email.ilike."*@example.com",bio.wfts.cat)',
		});
		expect(
			filterQuery({ match: 'any', conditions: [{ op: 'is', column: 'x', value: 'null' }] }),
		).toEqual({
			or: '(x.is.null)',
		});
	});

	it('needs an explicit match and at least one condition', () => {
		expect(
			validate({ conditions: [{ op: 'eq', column: 'a', value: 1 }] }, rowFilter.json),
		).not.toEqual([]);
		expect(validate({ match: 'all', conditions: [] }, rowFilter.json)).not.toEqual([]);
	});
});

describe('path segments and responses', () => {
	it('encodes each interpolated segment and refuses an ID that is not one', () => {
		expect(issuesPath({ owner: 'a b', repository: 'x/y' })).toBe('/repos/a%20b/x%2Fy/issues');
		expect(documentPath(documentIdOf('https://docs.google.com/document/d/1Ab-_c/edit'), ':x')).toBe(
			'/documents/1Ab-_c:x',
		);
		expect(() => documentIdOf('../x')).toThrow('Not a Google Docs ID or URL');
		expect(() => driveIdOf('a/b')).toThrow('Not a Google Drive ID or URL');
	});

	it('types an issue response and names the field that fails', () => {
		expect(() => issueOf({ id: 1, title: 'x' })).toThrow(/response\.number/);
	});
});
