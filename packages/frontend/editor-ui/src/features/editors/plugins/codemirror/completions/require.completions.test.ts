import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { useSettingsStore } from '@/stores/settings.store';
import { useRequireCompletions } from '@/features/editors/components/CodeNodeEditor/completions/require.completions';
import { AUTOCOMPLETABLE_BUILT_IN_MODULES_JS } from '@/features/editors/components/CodeNodeEditor/constants';
import * as utils from '@/features/editors/plugins/codemirror/completions/utils';

let settingsStore: ReturnType<typeof useSettingsStore>;

describe('requireCompletions', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		settingsStore = useSettingsStore();

		vi.spyOn(utils, 'receivesNoBinaryData').mockReturnValue(true); // hide $binary
		vi.spyOn(utils, 'isSplitInBatchesAbsent').mockReturnValue(false); // show context
		vi.spyOn(utils, 'hasActiveNode').mockReturnValue(true);
	});

	it('should return completions for explicit empty context', () => {
		vi.spyOn(settingsStore, 'allowedModules', 'get').mockReturnValue({
			builtIn: ['fs', 'path'],
			external: ['lodash'],
		});
		const state = EditorState.create({ doc: 'req', selection: { anchor: 3 } });
		const context = new CompletionContext(state, 3, true);
		const result = useRequireCompletions().requireCompletions(context);
		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(3);
		expect(result?.options).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "require('fs');" }),
				expect.objectContaining({ label: "require('path');" }),
				expect.objectContaining({ label: "require('lodash');" }),
			]),
		);
	});

	it('should return completions for partial match', () => {
		vi.spyOn(settingsStore, 'allowedModules', 'get').mockReturnValue({
			builtIn: ['fs', 'path'],
			external: ['lodash'],
		});
		const state = EditorState.create({ doc: 'req', selection: { anchor: 3 } });
		const context = new CompletionContext(state, 3, true);
		const result = useRequireCompletions().requireCompletions(context);
		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(3);
		expect(result?.options).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "require('fs');" }),
				expect.objectContaining({ label: "require('path');" }),
				expect.objectContaining({ label: "require('lodash');" }),
			]),
		);
	});

	it('should handle built-in wildcard', () => {
		vi.spyOn(settingsStore, 'allowedModules', 'get').mockReturnValue({
			builtIn: ['*'],
			external: [],
		});
		const state = EditorState.create({ doc: 'req', selection: { anchor: 3 } });
		const context = new CompletionContext(state, 3, true);
		const result = useRequireCompletions().requireCompletions(context);
		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(AUTOCOMPLETABLE_BUILT_IN_MODULES_JS.length);
		expect(result?.options).toEqual(
			expect.arrayContaining(
				AUTOCOMPLETABLE_BUILT_IN_MODULES_JS.map((module) =>
					expect.objectContaining({ label: `require('${module}');` }),
				),
			),
		);
	});

	it('should return null for non-matching context', () => {
		const state = EditorState.create({ doc: 'randomText', selection: { anchor: 10 } });
		const context = new CompletionContext(state, 10, true);
		expect(useRequireCompletions().requireCompletions(context)).toBeNull();
	});

	it('should return completions for mixed built-in and external modules', () => {
		vi.spyOn(settingsStore, 'allowedModules', 'get').mockReturnValue({
			builtIn: ['fs'],
			external: ['lodash', 'axios'],
		});
		const state = EditorState.create({ doc: 'req', selection: { anchor: 3 } });
		const context = new CompletionContext(state, 3, true);
		const result = useRequireCompletions().requireCompletions(context);
		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(3);
		expect(result?.options).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "require('fs');" }),
				expect.objectContaining({ label: "require('lodash');" }),
				expect.objectContaining({ label: "require('axios');" }),
			]),
		);
	});

	it('should handle empty allowedModules gracefully', () => {
		vi.spyOn(settingsStore, 'allowedModules', 'get').mockReturnValue({
			builtIn: [],
			external: [],
		});
		const state = EditorState.create({ doc: 'req', selection: { anchor: 3 } });
		const context = new CompletionContext(state, 3, true);
		const result = useRequireCompletions().requireCompletions(context);
		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(0);
	});

	it('should handle missing allowedModules gracefully', () => {
		vi.spyOn(settingsStore, 'allowedModules', 'get').mockReturnValue({
			builtIn: undefined,
			external: undefined,
		});
		const state = EditorState.create({ doc: 'req', selection: { anchor: 3 } });
		const context = new CompletionContext(state, 3, true);
		const result = useRequireCompletions().requireCompletions(context);
		expect(result?.options).toHaveLength(0);
	});
});
