import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';
import { RegexEngineConfig } from '../regex-engine.config';

describe('RegexEngineConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	it('defaults to the built-in js engine', () => {
		expect(Container.get(RegexEngineConfig).engine).toBe('js');
	});

	it('falls back to js and warns on an unknown engine', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv('N8N_REGEX_ENGINE', 'nonsense');

		expect(Container.get(RegexEngineConfig).engine).toBe('js');
		expect(warn).toHaveBeenCalled();
	});

	it('reaches a consumer through GlobalConfig', () => {
		expect(Container.get(GlobalConfig).regexEngine.engine).toBe('js');
	});
});
