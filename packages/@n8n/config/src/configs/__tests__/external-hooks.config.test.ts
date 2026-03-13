import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

const getExternalHookFiles = (env: Record<string, string> = {}) => {
	jest.replaceProperty(process, 'env', env);
	return Container.get(GlobalConfig).externalHooks.files;
};

describe('ExternalHooksConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should split by colon separator by default', () => {
		expect(
			getExternalHookFiles({ EXTERNAL_HOOK_FILES: '/path/to/hook1.js:/path/to/hook2.js' }),
		).toEqual(['/path/to/hook1.js', '/path/to/hook2.js']);
	});

	it('should split by semicolon when separator is set to ;', () => {
		expect(
			getExternalHookFiles({
				EXTERNAL_HOOK_FILES_SEPARATOR: ';',
				EXTERNAL_HOOK_FILES: 'C:\\Github\\n8n\\hooks.js;C:\\Other\\hooks.js',
			}),
		).toEqual(['C:\\Github\\n8n\\hooks.js', 'C:\\Other\\hooks.js']);
	});

	it('should handle Windows absolute paths with colon when separator is ;', () => {
		expect(
			getExternalHookFiles({
				EXTERNAL_HOOK_FILES_SEPARATOR: ';',
				EXTERNAL_HOOK_FILES: 'C:\\path\\hook.js',
			}),
		).toEqual(['C:\\path\\hook.js']);
	});

	it('should return empty array when no files are configured', () => {
		expect(getExternalHookFiles()).toEqual([]);
	});
});
