import { describe, expect, it } from 'vitest';

import {
	setWebSearchCredential,
	setWebSearchEnabled,
	setWebSearchMode,
} from '../utils/webSearchConfig';
import type { AgentJsonWebSearchConfig } from '../types';

describe('webSearchConfig', () => {
	it('enables web search with auto mode by default', () => {
		expect(setWebSearchEnabled(undefined, true)).toEqual({
			enabled: true,
			mode: 'auto',
		});
	});

	it('disables web search without dropping existing settings', () => {
		const current: AgentJsonWebSearchConfig = {
			enabled: true,
			mode: 'n8n',
			credential: { id: 'cred-1', name: 'Brave', type: 'braveSearchApi' },
		};

		expect(setWebSearchEnabled(current, false)).toEqual({
			enabled: false,
			mode: 'n8n',
			credential: { id: 'cred-1', name: 'Brave', type: 'braveSearchApi' },
		});
	});

	it('updates mode without dropping the selected credential', () => {
		const current: AgentJsonWebSearchConfig = {
			enabled: true,
			mode: 'auto',
			credential: { id: 'cred-1', name: 'SearXNG', type: 'searXngApi' },
		};

		expect(setWebSearchMode(current, 'n8n')).toEqual({
			enabled: true,
			mode: 'n8n',
			credential: { id: 'cred-1', name: 'SearXNG', type: 'searXngApi' },
		});
	});

	it('stores selected fallback credential id, name, and type', () => {
		expect(
			setWebSearchCredential(undefined, {
				id: 'cred-1',
				name: 'Brave',
				type: 'braveSearchApi',
			}),
		).toEqual({
			enabled: true,
			mode: 'auto',
			credential: { id: 'cred-1', name: 'Brave', type: 'braveSearchApi' },
		});
	});
});
