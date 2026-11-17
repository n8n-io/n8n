import { codeNodeModules, hostCodeModules } from '../compiled-code-modules';

describe('codeNodeModules', () => {
	it('allows no module by default', () => {
		expect(codeNodeModules({})).toEqual({ builtin: [], external: [] });
		expect(hostCodeModules({})).toEqual({
			WF_FALLBACK_CODE_ALLOW_BUILTIN: '',
			WF_FALLBACK_CODE_ALLOW_EXTERNAL: '',
		});
	});

	it('reads the two lists of n8n', () => {
		const env = {
			NODE_FUNCTION_ALLOW_BUILTIN: 'crypto, fs,,',
			NODE_FUNCTION_ALLOW_EXTERNAL: 'lodash',
		};
		expect(codeNodeModules(env)).toEqual({ builtin: ['crypto', 'fs'], external: ['lodash'] });
		expect(hostCodeModules(env)).toEqual({
			WF_FALLBACK_CODE_ALLOW_BUILTIN: 'crypto,fs',
			WF_FALLBACK_CODE_ALLOW_EXTERNAL: 'lodash',
		});
	});

	it('reads every module only from a list that is the star alone', () => {
		expect(codeNodeModules({ NODE_FUNCTION_ALLOW_BUILTIN: '*' }).builtin).toEqual(['*']);
		expect(codeNodeModules({ NODE_FUNCTION_ALLOW_BUILTIN: 'crypto,*' }).builtin).toEqual([
			'crypto',
		]);
	});
});
