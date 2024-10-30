import { autocompletion, type CompletionSource } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { linter, type LintSource } from '@codemirror/lint';
import { combineConfig, Facet, type Extension } from '@codemirror/state';
import { EditorView, hoverTooltip } from '@codemirror/view';
import * as Comlink from 'comlink';
import type { LanguageServiceWorker } from './types';

export const tsFacet = Facet.define<
	{ worker: Comlink.Remote<LanguageServiceWorker> },
	{ worker: Comlink.Remote<LanguageServiceWorker> }
>({
	combine(configs) {
		return combineConfig(configs, {});
	},
});

const tsCompletions: CompletionSource = async (context) => {
	const { worker } = context.state.facet(tsFacet);
	const { pos, explicit } = context;

	let word = context.matchBefore(/\w*/);
	if (!word?.text) {
		word = context.matchBefore(/\./);
	}

	if (!word?.text && !explicit) return null;

	const result = await worker.getCompletionsAtPos(context.pos);

	if (!result) return result;

	return {
		from: word ? (word.text === '.' ? word.to : word.from) : pos,
		options: result.options,
	};
};

const tsLint: LintSource = async (view) => {
	const { worker } = view.state.facet(tsFacet);
	return await worker.getDiagnostics();
};

type HoverSource = Parameters<typeof hoverTooltip>[0];
const tsHover: HoverSource = async (view, pos) => {
	const { worker } = view.state.facet(tsFacet);

	const info = await worker.getHoverTooltip(pos);

	console.log('hover?', info);

	if (!info) return null;

	return {
		pos: info.start,
		end: info.end,
		create: () => {
			const div = document.createElement('div');
			if (info.quickInfo?.displayParts) {
				for (const part of info.quickInfo.displayParts) {
					const span = div.appendChild(document.createElement('span'));
					span.className = `quick-info-${part.kind}`;
					span.innerText = part.text;
				}
			}
			return { dom: div };
		},
	};
};

function webWorker(path: string) {
	return new Worker(new URL(path, import.meta.url), { type: 'module' });
}

export async function typescript(initialValue: string): Promise<Extension> {
	const worker = Comlink.wrap<LanguageServiceWorker>(webWorker('./worker/typescript.worker.ts'));

	await worker.init(initialValue);

	return [
		tsFacet.of({ worker }),
		javascriptLanguage,
		autocompletion({
			icons: false,
			defaultKeymap: false,
			override: [tsCompletions],
		}),
		linter(tsLint),
		hoverTooltip(tsHover),
		EditorView.updateListener.of(async (update) => {
			if (!update.docChanged) return;
			await worker.updateFile(update.state.doc.toString());
		}),
	];
}
