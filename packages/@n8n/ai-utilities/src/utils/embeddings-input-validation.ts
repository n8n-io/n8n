import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Validates query input for embedQuery operations.
 * Throws NodeOperationError if query is invalid (undefined, null, or empty string).
 *
 * @param query - The query to validate
 * @param node - The node for error context
 * @returns The validated query string
 * @throws NodeOperationError if query is invalid
 */
export function validateEmbedQueryInput(query: unknown, node: INode): string {
	if (typeof query !== 'string' || query === '') {
		throw new NodeOperationError(node, 'Cannot embed empty or undefined text', {
			description:
				'The text provided for embedding is empty or undefined. This can happen when: the input expression evaluates to undefined, the AI agent calls a tool without proper arguments, or a required field is missing.',
		});
	}
	return query;
}

/**
 * Validates documents input for embedDocuments operations.
 * Throws NodeOperationError if documents array is invalid or contains invalid entries.
 *
 * @param documents - The documents array to validate
 * @param node - The node for error context
 * @returns The validated documents array
 * @throws NodeOperationError if documents is not an array or contains invalid entries
 */
export function validateEmbedDocumentsInput(documents: unknown, node: INode): string[] {
	if (!Array.isArray(documents)) {
		throw new NodeOperationError(node, 'Documents must be an array', {
			description: 'Expected an array of strings to embed.',
		});
	}

	const invalidIndex = documents.findIndex(
		(doc) => doc === undefined || doc === null || doc === '',
	);

	if (invalidIndex !== -1) {
		throw new NodeOperationError(node, `Invalid document at index ${invalidIndex}`, {
			description: `Document at index ${invalidIndex} is empty or undefined. All documents must be non-empty strings.`,
		});
	}

	return documents;
}
