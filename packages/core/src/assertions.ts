import { ApplicationError } from 'n8n-workflow';

export function assertValidDate(candidate: unknown): asserts candidate is Date {
	if (!(candidate instanceof Date) || isNaN(candidate.getTime())) {
		throw new ApplicationError('Found invalid date', { extra: { date: candidate } });
	}
}
