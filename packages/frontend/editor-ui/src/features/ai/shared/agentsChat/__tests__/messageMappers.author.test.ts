import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { convertDbMessages } from '../messageMappers';

describe('convertDbMessages — author', () => {
	it('keeps the integration author on user messages and leaves it undefined otherwise', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm-1',
				role: 'user',
				content: [{ type: 'text', text: 'hey' }],
				author: { id: 'U1', name: 'alice' },
			},
			{ id: 'm-2', role: 'user', content: [{ type: 'text', text: 'hi' }] },
		];

		const [withAuthor, withoutAuthor] = convertDbMessages(dbMessages);

		expect(withAuthor.author).toEqual({ id: 'U1', name: 'alice' });
		expect(withoutAuthor.author).toBeUndefined();
	});
});
