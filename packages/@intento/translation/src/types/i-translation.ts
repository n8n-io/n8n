export interface ITranslation {
	readonly textPosition: number;
	readonly segmentPosition: number;
	readonly text: string;
	readonly detectedLanguage?: string;
}
