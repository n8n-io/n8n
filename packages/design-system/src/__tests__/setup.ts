import '@testing-library/jest-dom';
import { config } from '@vue/test-utils';

import { N8nPlugin } from 'n8n-design-system/plugin';

config.global.plugins = [N8nPlugin];

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));
