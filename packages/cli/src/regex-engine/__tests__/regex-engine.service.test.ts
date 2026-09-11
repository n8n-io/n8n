import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { resetUserRegexEngine, safeRegex, safeUserRegex } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

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
	it('installs the built-in engine for js', async () => {
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
});

describe('shutdown', () => {
	it('leaves both entry points usable', async () => {
		const subject = service('js');
		await subject.init();

		subject.shutdown();

		expect(safeUserRegex.test('^a$', 'a')).toBe(true);
		expect(safeRegex.test('^a$', 'a')).toBe(true);
	});

	it('does nothing when init never ran', () => {
		expect(() => service('js').shutdown()).not.toThrow();
	});
});
