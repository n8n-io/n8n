import { adapterWithLocator } from './test-helpers';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

function typeLocator() {
	return {
		count: vi.fn().mockResolvedValue(1),
		isEditable: vi.fn().mockResolvedValue(true),
		clear: vi.fn().mockResolvedValue(undefined),
		fill: vi.fn().mockResolvedValue(undefined),
		pressSequentially: vi.fn().mockResolvedValue(undefined),
		press: vi.fn().mockResolvedValue(undefined),
	};
}

const MANIFEST = '{\n    "display_information": {\n        "name": "n8n"\n    }\n}';

describe('PlaywrightAdapter.type', () => {
	describe('paste mode', () => {
		it('inserts the value in a single operation', async () => {
			const locator = typeLocator();
			const adapter = adapterWithLocator('p1', locator);

			await adapter.type('p1', { ref: 'e3' }, MANIFEST, { mode: 'paste' });

			expect(locator.fill).toHaveBeenCalledWith(MANIFEST);
			expect(locator.pressSequentially).not.toHaveBeenCalled();
		});

		it('still submits when asked', async () => {
			const locator = typeLocator();
			const adapter = adapterWithLocator('p1', locator);

			await adapter.type('p1', { ref: 'e3' }, MANIFEST, { mode: 'paste', submit: true });

			expect(locator.press).toHaveBeenCalledWith('Enter');
		});

		it('does not clear separately, because the insert already replaces', async () => {
			const locator = typeLocator();
			const adapter = adapterWithLocator('p1', locator);

			await adapter.type('p1', { ref: 'e3' }, MANIFEST, { mode: 'paste', clear: true });

			expect(locator.clear).not.toHaveBeenCalled();
		});
	});

	describe('type mode', () => {
		it('is the default, and still enters the value key by key', async () => {
			const locator = typeLocator();
			const adapter = adapterWithLocator('p1', locator);

			await adapter.type('p1', { ref: 'e3' }, 'hello', { clear: true });

			expect(locator.clear).toHaveBeenCalled();
			expect(locator.pressSequentially).toHaveBeenCalledWith('hello', { delay: undefined });
			expect(locator.fill).not.toHaveBeenCalled();
		});
	});
});
