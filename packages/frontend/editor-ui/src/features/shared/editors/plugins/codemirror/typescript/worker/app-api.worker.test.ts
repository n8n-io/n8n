import * as tsvfs from '@typescript/vfs';
import ts from 'typescript';
import { mock } from 'vitest-mock-extended';

import { appApiWorker } from './app-api.worker';
import { APP_COMPILER_OPTIONS, COMPILER_OPTIONS } from './constants';

vi.mock('@/app/plugins/cache', () => ({
	indexedDbCache: async () => ({
		getItem: () => '{}',
		setItem: () => {},
		removeItem: () => {},
		clear: () => {},
		getAllWithPrefix: async () => ({}),
	}),
}));
vi.mock('@typescript/vfs');

describe('App API worker', () => {
	beforeEach(() => {
		vi.mocked(tsvfs.createDefaultMapFromCDN).mockResolvedValue(new Map());
		vi.mocked(tsvfs.createVirtualTypeScriptEnvironment).mockReturnValue(
			mock<tsvfs.VirtualTypeScriptEnvironment>(),
		);
	});

	it('extends the Code node compiler options with the classic JSX runtime', () => {
		expect(APP_COMPILER_OPTIONS).toEqual({
			...COMPILER_OPTIONS,
			jsx: ts.JsxEmit.React,
			jsxFactory: 'h',
			jsxFragmentFactory: 'Fragment',
		});
	});

	it('checks the source as a .tsx file with the JSX compiler options', async () => {
		await appApiWorker.init({ id: 'block-1', content: ['export function render() {}'] });

		expect(tsvfs.createDefaultMapFromCDN).toHaveBeenCalledWith(
			APP_COMPILER_OPTIONS,
			ts.version,
			true,
			ts,
			undefined,
			undefined,
			expect.anything(),
		);
		const [, rootFiles, , options] = vi.mocked(tsvfs.createVirtualTypeScriptEnvironment).mock
			.calls[0];
		expect(rootFiles).toContain('block-1.tsx');
		expect(options).toBe(APP_COMPILER_OPTIONS);
	});
});
