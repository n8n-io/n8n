import type { DetectedContext } from '@n8n/computer-use/context';

const { mockDetectOpenContexts } = vi.hoisted(() => ({ mockDetectOpenContexts: vi.fn() }));

vi.mock('@n8n/computer-use/context', () => ({
	detectOpenContexts: mockDetectOpenContexts,
	captureScreenshotAttachment: vi.fn(),
}));

vi.mock('@n8n/computer-use/logger', () => ({
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('electron', () => ({
	app: { getName: vi.fn(() => 'n8n Assistant') },
}));

import { ContextDetector } from './context-detector';

function ctx(overrides: Partial<DetectedContext>): DetectedContext {
	return { kind: 'other', ...overrides };
}

describe('ContextDetector', () => {
	beforeEach(() => mockDetectOpenContexts.mockReset());

	describe('refresh', () => {
		it('filters out the macOS screenshot UI overlay but keeps a screenshot file opened in Preview', async () => {
			mockDetectOpenContexts.mockResolvedValue([
				// The floating "Bildschirmfoto" overlay — frontmost, but not real context.
				ctx({
					app: 'Bildschirmfoto',
					bundleId: 'com.apple.screencaptureui',
					windowTitle: 'Bildschirmfoto',
				}),
				// A screenshot file open in Preview: same-looking title, but a real window to keep.
				ctx({
					kind: 'file',
					app: 'Vorschau',
					bundleId: 'com.apple.Preview',
					windowTitle: 'Screenshot 2026-06-11.png',
				}),
			]);

			const options = await new ContextDetector().refresh();

			expect(options.map((o) => o.bundleId)).toEqual(['com.apple.Preview']);
		});

		it('filters out our own window and other system overlays', async () => {
			mockDetectOpenContexts.mockResolvedValue([
				ctx({ app: 'n8n Assistant', bundleId: 'io.n8n.gateway' }),
				ctx({ app: 'Control Center', bundleId: 'com.apple.controlcenter' }),
				ctx({ kind: 'browser', app: 'Google Chrome', bundleId: 'com.google.Chrome' }),
			]);

			const options = await new ContextDetector().refresh();

			expect(options.map((o) => o.bundleId)).toEqual(['com.google.Chrome']);
		});
	});
});
