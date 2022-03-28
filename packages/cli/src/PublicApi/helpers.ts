import * as querystring from 'querystring';
// eslint-disable-next-line import/no-extraneous-dependencies
import { pick } from 'lodash';
import { User } from '../databases/entities/User';

interface IPaginationOffsetDecoded {
	offset: number;
	limit: number;
}

export const decodeCursor = (cursor: string): IPaginationOffsetDecoded => {
	const data = JSON.parse(Buffer.from(cursor, 'base64').toString()) as string;
	const unserializedData = querystring.decode(data) as { offset: string; limit: string };
	return {
		offset: parseInt(unserializedData.offset, 10),
		limit: parseInt(unserializedData.limit, 10),
	};
};

export const getNextCursor = (
	offset: number,
	limit: number,
	numberOfRecords: number,
): string | null => {
	const retrieveRecordsLength = offset + limit;

	if (retrieveRecordsLength < numberOfRecords) {
		return Buffer.from(
			JSON.stringify(
				querystring.encode({
					limit,
					offset: offset + limit,
				}),
			),
		).toString('base64');
	}

	return null;
};

export const getSelectableProperties = (table: 'user' | 'role'): string[] => {
	return {
		user: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
		role: ['id', 'name', 'scope', 'createdAt', 'updatedAt'],
	}[table];
};

export const connectionName = (): string => {
	return 'default';
};

export const clean = (users: User[], keepRole = false): Array<Partial<User>> => {
	return users.map((user) =>
		pick(user, getSelectableProperties('user').concat(keepRole ? ['globalRole'] : [])),
	);
};
