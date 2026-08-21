import { autocompletion } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { LanguageSupport } from '@codemirror/language';
import { linter } from '@codemirror/lint';
import { Text, type Extension } from '@codemirror/state';
import { EditorView, hoverTooltip } from '@codemirror/view';
import * as Comlink from 'comlink';
import { onBeforeUnmount, ref, toValue, type MaybeRefOrGetter } from 'vue';

import type {
	LanguageServiceWorker,
	RemoteLanguageServiceWorkerInit,
	WorkerInitOptions,
} from '../types';
import { typescriptCompletionSource } from './completions';
import { typescriptWorkerFacet } from './facet';
import { typescriptHoverTooltips } from './hoverTooltip';
import { typescriptLintSource } from './linter';

export interface StandaloneTypescriptOptions {
	id: string;
	variables: string[];
	snippets: NonNullable<WorkerInitOptions['snippets']>;
}

/**
 * TypeScript language support (completions, hover, diagnostics) for editors
 * outside the workflow editor — no workflow document, NDV, or node context.
 * The edited file is treated as a single snippet expression.
 */
export function useTypescriptStandalone(
	view: MaybeRefOrGetter<EditorView | undefined>,
	options: MaybeRefOrGetter<StandaloneTypescriptOptions>,
) {
	const webWorker = ref<Worker>();
	const worker = ref<Comlink.Remote<LanguageServiceWorker>>();

	async function createWorker(): Promise<Extension> {
		webWorker.value?.terminate();
		webWorker.value = new Worker(new URL('../worker/typescript.worker.ts', import.meta.url), {
			type: 'module',
		});
		const { init } = Comlink.wrap<RemoteLanguageServiceWorkerInit>(webWorker.value);
		const opts = toValue(options);
		worker.value = await init(
			{
				id: opts.id,
				content: Comlink.proxy((toValue(view)?.state.doc ?? Text.empty).toJSON()),
				allNodeNames: [],
				inputNodeNames: [],
				variables: opts.variables,
				snippets: opts.snippets,
				mode: 'runOnceForEachItem',
				context: 'snippet',
			},
			Comlink.proxy(async () => undefined),
		);

		return [
			typescriptWorkerFacet.of({ worker: worker.value }),
			new LanguageSupport(javascriptLanguage, [
				javascriptLanguage.data.of({ autocomplete: typescriptCompletionSource }),
			]),
			autocompletion({ icons: false, aboveCursor: true }),
			linter(typescriptLintSource),
			hoverTooltip(typescriptHoverTooltips, {
				hideOnChange: true,
				hoverTime: 500,
			}),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					void worker.value?.updateFile(update.changes.toJSON());
				}
			}),
		];
	}

	onBeforeUnmount(() => {
		webWorker.value?.terminate();
	});

	return { createWorker };
}
