import { extractResourceReferences, type PageResourceReference } from '@n8n/api-types';

import { PAGE_REFERENCE_ID_MAX_LENGTH } from './page-reference.entity';
import type { PageReferenceRow } from './page-reference.repository';

function toReferenceRow(reference: PageResourceReference): PageReferenceRow {
	return {
		resourceType: reference.resourceType,
		resourceId: reference.resourceId,
		parentResourceId: reference.resourceType === 'node' ? reference.workflowId : null,
	};
}

/** A link with an id that is too long cannot point to a real resource. */
function fitsReferenceColumns({ resourceId, parentResourceId }: PageReferenceRow): boolean {
	return [resourceId, parentResourceId ?? ''].every(
		(id) => id.length <= PAGE_REFERENCE_ID_MAX_LENGTH,
	);
}

/** Lists the reference rows that a markdown content yields, without duplicates. */
export function toReferenceRows(content: string): PageReferenceRow[] {
	return extractResourceReferences(content).map(toReferenceRow).filter(fitsReferenceColumns);
}
