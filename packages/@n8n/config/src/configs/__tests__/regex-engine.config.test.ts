import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';
import { RegexEngineConfig } from '../regex-engine.config';

describe('RegexEngineConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.resetAllMocks();
		vi.unstubAllEnvs();
	});

	describe('defaults', () => {
		test('engine defaults to js', () => {
			expect(Container.get(RegexEngineConfig).engine).toBe('js');
		});
	});

	describe('N8N_REGEX_ENGINE', () => {
		test('overrides engine to pcre2', () => {
			vi.stubEnv('N8N_REGEX_ENGINE', 'pcre2');
			expect(Container.get(RegexEngineConfig).engine).toBe('pcre2');
		});

		test('reaches the consumer through GlobalConfig', () => {
			vi.stubEnv('N8N_REGEX_ENGINE', 'pcre2');
			expect(Container.get(GlobalConfig).regexEngine.engine).toBe('pcre2');
		});

		test('falls back to default on invalid value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('N8N_REGEX_ENGINE', 'not-an-engine');
			expect(Container.get(RegexEngineConfig).engine).toBe('js');
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});
});
