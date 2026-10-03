import { parse, path, t } from '@n8n/node-sdk';

import {
	content as contentSchema,
	document,
	documentIdOf,
	documentUrlOf,
} from '../google-docs.node';
import { markdownRequests } from '../markdown';

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';

/** The body of a new document starts at index 1. */
const BODY_START = 1;

const created = t.obj({
	documentId: t.str(),
	title: t.str(),
	url: t.str().hint('The edit link, e.g. to send by email'),
});

export const createDocument = document.action('create', {
	action: 'Create a document',
	summary: 'Create a Google Doc, optionally with content. Markdown keeps headings, lists and bold.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	// The Docs API has no folder field, so the Drive API creates the file.
	egress: { hosts: ['www.googleapis.com'] },
	input: {
		title: t.str().with({ minLength: 1 }),
		folderId: t.str().hint('Drive folder ID; My Drive when not set').optional(),
		content: contentSchema.optional(),
	},
	output: created,
	async run({ input, http }) {
		const file = await http.request({
			method: 'POST',
			url: DRIVE_FILES,
			body: {
				name: input.title,
				mimeType: 'application/vnd.google-apps.document',
				...(input.folderId ? { parents: [input.folderId] } : {}),
			},
		});
		const created = parse(t.obj({ id: t.str() }), file).id;
		if (!created) throw new Error('Google Drive gave no ID for the new document');
		const id = documentIdOf(created);
		const { content } = input;
		const requests = !content
			? []
			: content.format === 'markdown'
				? markdownRequests(content.markdown, BODY_START)
				: [{ insertText: { text: content.text, endOfSegmentLocation: { segmentId: '' } } }];
		if (requests.length > 0) {
			await http.request({
				method: 'POST',
				path: path`/documents/${id}:batchUpdate`,
				body: { requests },
			});
		}
		return { documentId: id, title: input.title, url: documentUrlOf(id) };
	},
});
