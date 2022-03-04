// eslint-disable-next-line import/no-cycle
import { IPersonalizationSurveyAnswers } from '../../Interfaces';

export const idStringifier = {
	from: (value: number): string | number => (value ? value.toString() : value),
	to: (value: string): number | string => (value ? Number(value) : value),
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
