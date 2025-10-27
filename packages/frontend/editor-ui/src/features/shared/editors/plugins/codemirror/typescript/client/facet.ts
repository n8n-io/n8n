import { Facet, combineConfig } from '@codemirror/state';
import type { LanguageServiceWorker } from '../types';
import type * as Comlink from 'comlink';

export const typescriptWorkerFacet = Facet.define<
	{ worker: Comlink.Remote<LanguageServiceWorker> },
	{ worker: Comlink.Remote<LanguageServiceWorker> }
>({
	combine(configs) {
		return combineConfig(configs, {});
	},
});
