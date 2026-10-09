import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import {
	resetUserRegexEngine,
	safeInternalRegex,
	safeUserRegex,
	setUserRegexEngine,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ManagedRegexEngine } from '../regex-engine.service';
import { RegexEngineService } from '../regex-engine.service';

function service(engine: string) {
	return new RegexEngineService(
		mock<GlobalConfig>({ regexEngine: { engine } } as Partial<GlobalConfig>),
		mock<Logger>(),
	);
}

afterEach(() => {
	resetUserRegexEngine();
});

describe('init', () => {
	it('uses the built-in engine for js', async () => {
		await service('js').init();

		expect(safeUserRegex.test('^a$', 'a')).toBe(true);
		expect(safeUserRegex.test('^a$', 'b')).toBe(false);
	});

	it('keeps the timeout guard the built-in engine applies', async () => {
		await service('js').init();

		expect(() => safeUserRegex.test('(a+)+$', `${'a'.repeat(30)}b`)).toThrow(
			'Regular expression execution timed out',
		);
	});

	it('does not throw on shutdown after init for js', async () => {
		const subject = service('js');
		await subject.init();

		expect(() => subject.shutdown()).not.toThrow();
		expect(safeUserRegex.test('^a$', 'a')).toBe(true);
	});
});

describe('shutdown', () => {
	it('leaves safeUserRegex and safeInternalRegex usable', async () => {
		const subject = service('js');
		await subject.init();

		subject.shutdown();

		expect(safeUserRegex.test('^a$', 'a')).toBe(true);
		expect(safeInternalRegex.test('^a$', 'a')).toBe(true);
	});

	it('does nothing when init never ran', () => {
		expect(() => service('js').shutdown()).not.toThrow();
	});

	it('resets the user engine before disposing an installed one', () => {
		const subject = service('js');
		let stillRoutedToTheInstalledEngineAtDisposeTime = true;
		const engine = mock<ManagedRegexEngine>({
			test: vi.fn(() => true),
			dispose: vi.fn(() => {
				stillRoutedToTheInstalledEngineAtDisposeTime = safeUserRegex.test('no-match', 'x');
			}),
		});
		setUserRegexEngine(engine);
		(subject as unknown as { active?: ManagedRegexEngine }).active = engine;

		subject.shutdown();

		expect(engine.dispose).toHaveBeenCalledTimes(1);
		expect(stillRoutedToTheInstalledEngineAtDisposeTime).toBe(false);
		expect((subject as unknown as { active?: ManagedRegexEngine }).active).toBeUndefined();

		subject.shutdown();

		expect(engine.dispose).toHaveBeenCalledTimes(1);
	});
});
