import { defineNode, defineResource, t } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { GOOGLE_FILE_ID, googleFileIdOf } from '../google-file';
import { googleDocsOAuth2 } from './credentials';

export const googleDocs = defineNode({
	id: 'googleDocs',
	displayName: 'Google Docs',
	credential: credential({ types: [googleDocsOAuth2] }),
	baseUrl: 'https://docs.googleapis.com/v1',
});

export const googleDocument = defineResource({
	id: 'googleDocs.document',
	label: 'Document',
	shape: { pattern: GOOGLE_FILE_ID, 'x-n8n-hint': 'Document ID or Google Docs URL' },
});

export const documentIdOf = (value: string) => googleFileIdOf(value, 'Google Docs');

const open = { additionalProperties: true } as const;

/** The parts of a Docs API document that the actions read. */
export const documentResponse = t
	.obj({
		title: t.str().optional(),
		body: t
			.obj({
				content: t
					.arr(
						t
							.obj({
								endIndex: t.int().optional(),
								paragraph: t
									.obj({
										elements: t.arr(
											t
												.obj({ textRun: t.obj({ content: t.str() }).with(open).optional() })
												.with(open),
										),
									})
									.with(open)
									.optional(),
							})
							.with(open),
					)
					.optional(),
			})
			.with(open)
			.optional(),
	})
	.with(open);

export const documentUrlOf = (id: string) => `https://docs.google.com/document/d/${id}/edit`;

export const document = googleDocs.resource('document');

/** What a write adds to a document. Markdown keeps headings, lists, bold and links. */
export const content = t
	.variant('format', {
		text: { text: t.str().with({ minLength: 1 }).title('Text') },
		markdown: {
			markdown: t
				.str()
				.title('Markdown')
				.hint('Headings, - and 1. lists, **bold**, *italic*, [links](url)'),
		},
	})
	.title('Content')
	.hint('Use markdown for headings and bullet points');
