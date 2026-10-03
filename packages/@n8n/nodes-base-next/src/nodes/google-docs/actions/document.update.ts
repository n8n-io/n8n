import { parse, path, ref, t } from '@n8n/node-sdk';

import {
	content,
	document,
	documentIdOf,
	documentResponse,
	documentUrlOf,
	googleDocument,
} from '../google-docs.node';
import { markdownRequests } from '../markdown';

/** The index of the last newline of the body: the end of the last paragraph. */
const lastNewline = (response: unknown) =>
	Math.max(
		1,
		...(parse(documentResponse, response).body?.content ?? []).map(({ endIndex }) => endIndex ?? 1),
	) - 1;

export const updateDocument = document.action('update', {
	// Minor 1: an ID of any length, and the ID after /d/ in a URL.
	minor: 1,
	action: 'Append to a document',
	summary: 'Add text or Markdown at the end of a Google Doc.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	input: { document: ref(googleDocument), content },
	output: t.obj({ documentId: t.str(), url: t.str() }),
	async run({ input, http }) {
		const documentId = documentIdOf(input.document);
		const batchUpdate = path`/documents/${documentId}:batchUpdate`;
		if (input.content.format === 'text') {
			await http.request({
				method: 'POST',
				path: batchUpdate,
				body: {
					requests: [
						{ insertText: { text: input.content.text, endOfSegmentLocation: { segmentId: '' } } },
					],
				},
			});
			return { documentId, url: documentUrlOf(documentId) };
		}
		const end = lastNewline(await http.request({ path: path`/documents/${documentId}` }));
		// An empty body has only its last newline, at index 1.
		if (end <= 1) {
			const requests = markdownRequests(input.content.markdown, 1);
			if (requests.length > 0) {
				await http.request({ method: 'POST', path: batchUpdate, body: { requests } });
			}
			return { documentId, url: documentUrlOf(documentId) };
		}
		const requests = markdownRequests(input.content.markdown, end + 1);
		if (requests.length > 0) {
			const range = { startIndex: end + 1, endIndex: end + 2 };
			// The new paragraph starts as a copy of the last one, so it loses its heading and bullet.
			const reset = [
				{ insertText: { location: { index: end }, text: '\n' } },
				{ deleteParagraphBullets: { range } },
				{
					updateParagraphStyle: {
						range,
						paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
						fields: 'namedStyleType',
					},
				},
			];
			await http.request({
				method: 'POST',
				path: batchUpdate,
				body: { requests: [...reset, ...requests] },
			});
		}
		return { documentId, url: documentUrlOf(documentId) };
	},
});
