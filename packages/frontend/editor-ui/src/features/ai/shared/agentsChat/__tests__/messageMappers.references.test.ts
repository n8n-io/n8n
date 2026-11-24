import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { convertDbMessages } from '../messageMappers';

describe('convertDbMessages — references', () => {
	it('keeps the references of user messages only', () => {
		const references = [{ type: 'workflow', id: 'wf-1', name: 'Uptime monitor' }];
		const dbMessages: AgentPersistedMessageDto[] = [
			{ id: 'm-1', role: 'user', content: [{ type: 'text', text: 'Fix it' }], references },
			{ id: 'm-2', role: 'user', content: [{ type: 'text', text: 'Thanks' }], references: [] },
			{ id: 'm-3', role: 'assistant', content: [{ type: 'text', text: 'Done' }], references },
		];

		const [withReferences, withoutReferences, reply] = convertDbMessages(dbMessages);

		expect(withReferences.references).toEqual(references);
		expect(withoutReferences.references).toBeUndefined();
		expect(reply.references).toBeUndefined();
	});
});
