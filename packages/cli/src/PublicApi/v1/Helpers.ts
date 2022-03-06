import * as querystring from 'querystring';
import { User } from '../../databases/entities/User';

import { IPaginationOffsetDecoded } from './Interfaces';

export const decodeCursor = (cursor: string)
	: IPaginationOffsetDecoded => {
	const data = JSON.parse(Buffer.from(cursor, 'base64').toString());
	const unserializedData = querystring.decode(data) as { offset: string, limit: string };
	return {
		offset: parseInt(unserializedData.offset, 10),
		limit: parseInt(unserializedData.limit, 10),
	};
};

export const getNextCursor = (offset: number, limit: number, numberOfRecords: number): string | null => {
	const retrieveRecordsLength = offset + limit;

	if (retrieveRecordsLength < numberOfRecords) {
		return Buffer.from(JSON.stringify(querystring.encode({
			limit,
			offset: offset + limit,
		}))).toString('base64');
	}

	return null;
};

export const getUserBaseSelectableProperties = () => {
	return [
		'id',
		'email',
		'firstName',
		'lastName',
		'createdAt',
		'updatedAt',
		'password',
	];
};

export const getFinishedSetupVirtualProperty = () => {
	//sqlite does not support boolean type
	//so map it to string
	return `
		CASE 
			WHEN User.password IS NULL THEN 'false'
			ELSE 'true'
		END
	`;
};

export const addFinshedSetupProperty = (users: User[]) => {
	return users.map(user => {
		//@ts-ignore
		user.finishedSetup = true;
		if (user.password === null) {
			//@ts-ignore
			user.finishedSetup = false;
		}
		return user;
	});
};

//.addSelect(getFinishedSetupVirtualProperty(), 'User.finshedSetup')



