import type { IRestApiContext } from '../types';
import { get } from '../utils';

export const getFirstAdoptionDate = async (
	context: IRestApiContext,
	version: { major: number; minor: number; patch: number },
): Promise<string | null> => {
	const { data } = await get(context.baseUrl, '/instance-version-history/first-adoption', version);
	return data.date;
};
