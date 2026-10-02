import { parse, ref, t, type Infer, type Loose } from '@n8n/node-sdk';

import {
	document,
	documentIdOf,
	documentPath,
	documentResponse,
	googleDocument,
} from '../google-docs.node';

/** Mirrors the `simple` output of the legacy node: the text runs of the body paragraphs. */
const textOf = ({ body }: Loose<Infer<typeof documentResponse>>) =>
	(body?.content ?? [])
		.flatMap(({ paragraph }) => paragraph?.elements ?? [])
		.map(({ textRun }) => textRun?.content ?? '')
		.join('');

export const getDocument = document.action('get', {
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
			await http.request({ path: documentPath(documentId) }),
		);
		return { documentId, title: response.title ?? '', content: textOf(response) };
	},
});
