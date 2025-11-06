import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';
import { config } from '@vue/test-utils';

import { N8nPlugin } from '@n8n/design-system/plugin';

configure({ testIdAttribute: 'data-test-id' });

config.global.plugins = [N8nPlugin];

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));

// Globally mock is-emoji-supported
vi.mock('is-emoji-supported', () => ({
	isEmojiSupported: () => true,
}));
