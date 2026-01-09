export interface ITranslation {
	readonly textPosition: number;
	readonly segmentPosition: number;
	readonly translation: string;
	readonly detectedLanguage?: string;
}
