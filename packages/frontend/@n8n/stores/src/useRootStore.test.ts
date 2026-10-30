import { N8N_CLIENT_EDITOR_UI, N8N_CLIENT_HEADER } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';

import { useRootStore } from './useRootStore';

describe('useRootStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('sends the editor UI client header with the public API context', () => {
		const store = useRootStore();

		expect(store.publicApiContext.headers).toEqual({
			[N8N_CLIENT_HEADER]: N8N_CLIENT_EDITOR_UI,
		});
	});

	it('does not send the client header with the REST API context', () => {
		const store = useRootStore();

		expect(store.restApiContext).not.toHaveProperty('headers');
	});
});
