import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';

configure({ testIdAttribute: 'data-test-id' });

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));
