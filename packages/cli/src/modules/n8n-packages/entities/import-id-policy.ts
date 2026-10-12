import { generateNanoId } from '@n8n/utils/generate-nano-id';

import type { WorkflowIdPolicy } from '../n8n-packages.types';

/** Select an ID for a new import. Existing matches keep their IDs. */
const IMPORT_ID_POLICIES: Record<WorkflowIdPolicy, (sourceId: string) => string> = {
	new: () => generateNanoId(),
	source: (sourceId) => sourceId,
};

export function decideImportId(policy: WorkflowIdPolicy, sourceId: string): string {
	return IMPORT_ID_POLICIES[policy](sourceId);
}
