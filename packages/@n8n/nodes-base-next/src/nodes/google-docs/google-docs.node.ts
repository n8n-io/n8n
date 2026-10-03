import { defineNode, defineResource, t } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { googleOAuth2 } from '../google-oauth2';

// The legacy node creates a document through the Drive API, with the same credential.
export const googleDocsOAuth2 = googleOAuth2({
	id: 'googleDocs.oauth2',
	legacyName: 'googleDocsOAuth2Api',
	displayName: 'Google Docs OAuth2 API',
	hosts: ['docs.googleapis.com', 'www.googleapis.com'],
	scope: [
		'https://www.googleapis.com/auth/documents',
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.file',
	],
});

export const googleDocs = defineNode({
	id: 'googleDocs',
	displayName: 'Google Docs',
	credential: credential({ types: [googleDocsOAuth2] }),
	baseUrl: 'https://docs.googleapis.com/v1',
});

export const googleDocument = defineResource({
	id: 'googleDocs.document',
	label: 'Document',
	shape: { pattern: '[-_a-zA-Z0-9]{25,}', 'x-n8n-hint': 'Document ID or Google Docs URL' },
});

/** The ID in a Google Docs URL, else the value itself. It goes into a path, so it is checked. */
export function documentIdOf(value: string) {
	const id = /\/document\/d\/([-_a-zA-Z0-9]+)/.exec(value)?.[1] ?? value;
	if (!/^[-_a-zA-Z0-9]+$/.test(id)) throw new Error(`Not a Google Docs ID or URL: ${value}`);
	return id;
}

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
		text: { text: t.str().with({ minLength: 1 }) },
		markdown: {
			markdown: t.str().hint('Headings, - and 1. lists, **bold**, *italic*, [links](url)'),
		},
	})
	.hint('Use markdown for headings and bullet points');
