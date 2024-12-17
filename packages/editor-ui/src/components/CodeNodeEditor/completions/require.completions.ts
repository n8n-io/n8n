import { AUTOCOMPLETABLE_BUILT_IN_MODULES_JS } from '../constants';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useSettingsStore } from '@/stores/settings.store';

export function useRequireCompletions() {
	const settingsStore = useSettingsStore();
	const allowedModules = settingsStore.allowedModules;

	const toOption = (moduleName: string): Completion => ({
		label: `require('${moduleName}');`,
		type: 'variable',
	});
	/**
	 * Complete `req`	to `require('moduleName')` based on modules available in context.
	 */
	const requireCompletions = (context: CompletionContext): CompletionResult | null => {
		const preCursor = context.matchBefore(/req.*/);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const options: Completion[] = [];

		if (allowedModules.builtIn) {
			if (allowedModules.builtIn.includes('*')) {
				options.push(...AUTOCOMPLETABLE_BUILT_IN_MODULES_JS.map(toOption));
			} else if (allowedModules?.builtIn?.length > 0) {
				options.push(...allowedModules.builtIn.map(toOption));
			}
		}

		if (allowedModules.external) {
			if (allowedModules?.external?.length > 0) {
				options.push(...allowedModules.external.map(toOption));
			}
		}

		return {
			from: preCursor.from,
			options,
		};
	};

	return { requireCompletions };
}
