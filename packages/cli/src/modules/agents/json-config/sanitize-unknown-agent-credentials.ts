import { isDraftAgentConfig } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import { visitAgentCredentialReferences } from '../utils/visit-agent-credential-references';

/** Clear inaccessible references without changing authored tool inputs. */
export function sanitizeUnknownAgentCredentials(
	raw: unknown,
	accessibleCredentialIds: ReadonlySet<string>,
): unknown {
	if (!isRecord(raw)) return raw;

	const sanitized = structuredClone(raw);
	visitAgentCredentialReferences(sanitized, ({ id, setId, managedToken }) => {
		if (id !== managedToken && !accessibleCredentialIds.has(id)) setId('');
	});

	// Legacy drafts can retain a credential after their model is removed.
	const model = typeof sanitized.model === 'string' ? sanitized.model : undefined;
	if (isDraftAgentConfig({ model }) && typeof sanitized.credential === 'string') {
		sanitized.credential = '';
	}

	return sanitized;
}
