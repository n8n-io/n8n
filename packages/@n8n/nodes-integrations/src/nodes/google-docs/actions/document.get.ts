import { parse, path, ref, t, type Infer, type Loose } from '@n8n/node-sdk';

import { document, documentIdOf, documentResponse, googleDocument } from '../google-docs.node';

/** Mirrors the `simple` output of the legacy node: the text runs of the body paragraphs. */
const textOf = ({ body }: Loose<Infer<typeof documentResponse>>) =>
	(body?.content ?? [])
		.flatMap(({ paragraph }) => paragraph?.elements ?? [])
		.map(({ textRun }) => textRun?.content ?? '')
		.join('');

export const getDocument = document.action('get', {
	// Minor 1: an ID of any length, and the ID after /d/ in a URL.
	minor: 1,
	action: 'Get a document',
	summary: 'Read the text of a Google Doc.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: { document: ref(googleDocument) },
	output: t.obj({
		documentId: t.str(),
		title: t.str(),
		content: t.str().hint('Plain text of the body paragraphs; tables are left out'),
	}),
	async run({ input, http }) {
		const documentId = documentIdOf(input.document);
		const response = parse(
			documentResponse,
			await http.request({ path: path`/documents/${documentId}` }),
		);
		return { documentId, title: response.title ?? '', content: textOf(response) };
	},
});
