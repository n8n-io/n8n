import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { ConfluenceBodyFormat } from '../common';
import { bodyFormatOption } from '../common';

export interface ConfluenceBodyEnvelope extends IDataObject {
	representation: 'storage' | 'atlas_doc_format';
	value: string;
}

export function bodyProperties(operations: string[], bodyHint?: string): INodeProperties[] {
	const show = { resource: ['page'], operation: operations };
	const hint = bodyHint === undefined ? {} : { hint: bodyHint };
	return [
		{
			...bodyFormatOption,
			default: 'plainText',
			description: 'How the page content below is interpreted',
			displayOptions: { show },
			// Same values as the shared selector; write-oriented descriptions
			options: [
				{
					name: 'Atlas Doc Format',
					value: 'atlas_doc_format',
					description: 'Raw Atlassian Document Format JSON document',
				},
				{
					name: 'Plain Text',
					value: 'plainText',
					description: 'Text is wrapped in paragraph blocks; no markup needed',
				},
				{
					name: 'Storage',
					value: 'storage',
					description:
						'Confluence storage-format XHTML, e.g. &lt;h2&gt;Title&lt;/h2&gt;&lt;p&gt;Text&lt;/p&gt;',
				},
			],
		},
		{
			displayName: 'Body',
			name: 'bodyPlainText',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			description:
				'Page content as plain text; each line becomes a paragraph. Blank lines and leading whitespace are removed.',
			displayOptions: { show: { ...show, bodyFormat: ['plainText'] } },
			...hint,
		},
		{
			displayName: 'Body (Storage HTML)',
			name: 'bodyStorage',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			placeholder: '<h2>Heading</h2><p>Text</p>',
			description: 'Page content in Confluence storage format',
			displayOptions: { show: { ...show, bodyFormat: ['storage'] } },
			...hint,
		},
		{
			displayName: 'Body (ADF JSON)',
			name: 'bodyAdf',
			type: 'json',
			default: '',
			placeholder: '{ "type": "doc", "version": 1, "content": [] }',
			description: 'Page content as an Atlassian Document Format document',
			displayOptions: { show: { ...show, bodyFormat: ['atlas_doc_format'] } },
			...hint,
		},
	];
}

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
};

function escapeHtml(text: string): string {
	return text.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char]);
}

export function buildBodyEnvelope(
	format: ConfluenceBodyFormat,
	content: unknown,
): ConfluenceBodyEnvelope {
	switch (format) {
		case 'plainText': {
			if (typeof content === 'object' && content !== null) {
				throw new Error(
					'Plain text body must be text, got an object. Use the ADF JSON format for document objects.',
				);
			}
			const text = content === null || content === undefined ? '' : String(content);
			const paragraphs = text
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter((line) => line !== '')
				.map((line) => `<p>${escapeHtml(line)}</p>`);
			return { representation: 'storage', value: paragraphs.join('') };
		}

		case 'storage': {
			if (typeof content !== 'string') {
				throw new Error('Storage (HTML) body must be a string of Confluence storage-format markup');
			}
			return { representation: 'storage', value: content };
		}

		case 'atlas_doc_format': {
			let parsed: unknown = content;
			if (typeof content === 'string') {
				if (content.trim() === '') {
					throw new Error('ADF JSON body is empty. Provide an ADF document object.');
				}
				try {
					parsed = JSON.parse(content);
				} catch {
					throw new Error('ADF JSON body is not valid JSON');
				}
			}
			if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
				throw new Error('ADF JSON body must be a JSON object, e.g. { "type": "doc", ... }');
			}
			return { representation: 'atlas_doc_format', value: JSON.stringify(parsed) };
		}

		default:
			throw new Error(`Unsupported body format "${format as string}"`);
	}
}

const fieldByFormat: Record<ConfluenceBodyFormat, string> = {
	plainText: 'bodyPlainText',
	storage: 'bodyStorage',
	atlas_doc_format: 'bodyAdf',
};

export function readBodyEnvelope(
	ctx: IExecuteFunctions,
	itemIndex: number,
): ConfluenceBodyEnvelope {
	const format = ctx.getNodeParameter('bodyFormat', itemIndex, 'plainText') as ConfluenceBodyFormat;
	const content = ctx.getNodeParameter(fieldByFormat[format], itemIndex, '');
	try {
		return buildBodyEnvelope(format, content);
	} catch (error) {
		throw new NodeOperationError(ctx.getNode(), (error as Error).message, { itemIndex });
	}
}

/** Empty-means-keep variant for Update: a blank body field returns undefined
 * instead of an empty envelope, so the caller resends the current content. */
export function readBodyEnvelopeIfProvided(
	ctx: IExecuteFunctions,
	itemIndex: number,
): ConfluenceBodyEnvelope | undefined {
	const format = ctx.getNodeParameter('bodyFormat', itemIndex, 'plainText') as ConfluenceBodyFormat;
	const content = ctx.getNodeParameter(fieldByFormat[format], itemIndex, '');
	if (content === null || content === undefined) return undefined;
	if (typeof content === 'string' && content.trim() === '') return undefined;
	try {
		return buildBodyEnvelope(format, content);
	} catch (error) {
		throw new NodeOperationError(ctx.getNode(), (error as Error).message, { itemIndex });
	}
}
