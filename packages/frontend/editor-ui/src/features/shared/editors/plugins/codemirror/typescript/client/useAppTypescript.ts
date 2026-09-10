import { autocompletion, type CompletionSource } from '@codemirror/autocomplete';
import { tsxLanguage } from '@codemirror/lang-javascript';
import { LanguageSupport } from '@codemirror/language';
import { linter } from '@codemirror/lint';
import { Text, type Extension } from '@codemirror/state';
import { EditorView, hoverTooltip } from '@codemirror/view';
import * as Comlink from 'comlink';
import { forceParse } from '@/app/utils/forceParse';
import { onBeforeUnmount, ref, toValue, type MaybeRefOrGetter } from 'vue';

import type { AppWorkerInitOptions } from '../worker/app-api.worker';
import type { LanguageServiceWorker } from '../types';
import { typescriptWorkerFacet } from './facet';
import { typescriptHoverTooltips } from './hoverTooltip';
import { typescriptLintSource } from './linter';

type RemoteAppWorkerInit = {
	init(options: AppWorkerInitOptions): Comlink.Remote<LanguageServiceWorker>;
};

/** Client side of the App page code editor's TypeScript checking, minus the workflow-store wiring `useTypescript` needs (no node data fetcher, no execution mode). */
export function useAppTypescript(
	view: MaybeRefOrGetter<EditorView | undefined>,
	id: MaybeRefOrGetter<string>,
) {
	const worker = ref<Comlink.Remote<LanguageServiceWorker>>();
	const webWorker = ref<Worker>();

	const appTypescriptCompletionSource: CompletionSource = async (context) => {
		const word = context.matchBefore(/[\w$]*/);
		if (word === null) return null;
		const completionResult = await worker.value?.getCompletionsAtPos(context.pos);
		if (!completionResult || context.aborted) return null;
		return { from: word.from, options: completionResult.result.options };
	};

	async function createWorker(): Promise<Extension> {
		webWorker.value = new Worker(new URL('../worker/app-api.worker.ts', import.meta.url), {
			type: 'module',
		});
		const { init } = Comlink.wrap<RemoteAppWorkerInit>(webWorker.value);
		worker.value = await init({
			id: toValue(id),
			content: (toValue(view)?.state.doc ?? Text.empty).toJSON(),
		});

		const editor = toValue(view);
		if (editor) forceParse(editor);

		return [
			typescriptWorkerFacet.of({ worker: worker.value }),
			new LanguageSupport(tsxLanguage, [
				tsxLanguage.data.of({ autocomplete: appTypescriptCompletionSource }),
			]),
			autocompletion({ icons: false, aboveCursor: true }),
			linter(typescriptLintSource),
			hoverTooltip(typescriptHoverTooltips, { hideOnChange: true, hoverTime: 500 }),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) void worker.value?.updateFile(update.changes.toJSON());
			}),
		];
	}

	onBeforeUnmount(() => {
		webWorker.value?.terminate();
	});

	return { createWorker };
}
