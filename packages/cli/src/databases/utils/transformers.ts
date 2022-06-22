import { ValueTransformer } from 'typeorm';
// eslint-disable-next-line import/no-cycle
import { IPersonalizationSurveyAnswers } from '../../Interfaces';

export const idStringifier = {
	from: (value: number): string | number => (typeof value === 'number' ? value.toString() : value),
	to: (value: string): number | string => (typeof value === 'string' ? Number(value) : value),
};

export const lowerCaser = {
	from: (value: string): string => value,
	to: (value: string): string => (typeof value === 'string' ? value.toLowerCase() : value),
};

/**
 * Ensure a consistent return type for personalization answers in `User`.
 * Answers currently stored as `TEXT` on Postgres.
 */
export const answersFormatter = {
	to: (answers: IPersonalizationSurveyAnswers): IPersonalizationSurveyAnswers => answers,
	from: (answers: IPersonalizationSurveyAnswers | string): IPersonalizationSurveyAnswers => {
		return typeof answers === 'string'
			? (JSON.parse(answers) as IPersonalizationSurveyAnswers)
			: answers;
	},
};

/**
 * Transformer to store object as string and retrieve string as object.
 */
export const serializer: ValueTransformer = {
	to: (value: object | string): string =>
		typeof value === 'object' ? JSON.stringify(value) : value,
	from: (value: string | object): object =>
		typeof value === 'string' ? (JSON.parse(value) as object) : value,
};
