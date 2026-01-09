import type { IDescriptor } from 'intento-core';

export interface ITranslationDescriptor extends IDescriptor {
	batchLimit: number;
	segmentLimit: number;
	languageMap: {
		from: Map<string, string>;
		to: Map<string, string>;
	};
	knownLanguages: {
		from: Set<string>;
		to: Set<string>;
	};
}
