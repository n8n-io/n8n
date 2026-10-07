import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { InboxSourceRegistry, type InboxSource } from '../inbox-source.registry';

describe('InboxSourceRegistry', () => {
	it('rejects a duplicate without replacing the registered source', () => {
		const registry = new InboxSourceRegistry();
		const source = mock<InboxSource>({ type: 'workflow_review' });
		registry.register(source);
		expect(() => registry.register(mock<InboxSource>({ type: 'workflow_review' }))).toThrow(
			UnexpectedError,
		);
		expect(registry.find('workflow_review')).toBe(source);
		expect(registry.types()).toEqual(['workflow_review']);
	});
});
