import '@testing-library/jest-dom/vitest';

// jsdom has no matchMedia, and @n8n/composables' useDeviceSupport calls it on setup.
window.matchMedia = ((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: () => {},
	removeListener: () => {},
	addEventListener: () => {},
	removeEventListener: () => {},
	dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
