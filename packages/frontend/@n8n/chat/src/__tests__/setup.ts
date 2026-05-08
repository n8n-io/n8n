import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';

configure({ testIdAttribute: 'data-test-id' });

class ResizeObserverMock extends EventTarget {
	constructor() {
		super();
	}

	observe = vi.fn();

	disconnect = vi.fn();

	unobserve = vi.fn();
}

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});
afterEach(() => vi.unstubAllGlobals());
