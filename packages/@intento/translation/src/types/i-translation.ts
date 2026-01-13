import type { ISegment } from 'intento-segmentation';

export interface ITranslation extends ISegment {
	readonly detectedLanguage: string;
}
