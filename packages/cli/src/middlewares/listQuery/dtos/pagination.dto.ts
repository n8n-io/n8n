import { isIntegerString } from '@/utils';
import { ApplicationError } from 'n8n-workflow';

export class Pagination {
	static fromString(rawTake: string, rawSkip: string) {
		if (!isIntegerString(rawTake)) {
			throw new ApplicationError('Parameter take is not an integer string');
		}

		if (!isIntegerString(rawSkip)) {
			throw new ApplicationError('Parameter skip is not an integer string');
		}

		const [take, skip] = [rawTake, rawSkip].map((o) => parseInt(o, 10));

		const MAX_ITEMS_PER_PAGE = 50;

		return {
			take: Math.min(take, MAX_ITEMS_PER_PAGE),
			skip,
		};
	}
}
