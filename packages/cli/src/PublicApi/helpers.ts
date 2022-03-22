import * as querystring from 'querystring';

interface IPaginationOffsetDecoded {
	offset: number;
	limit: number;
}

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

export const getSelectableProperties = (table: string) => {
	return {
		user: [
			'id',
			'email',
			'firstName',
			'lastName',
			'createdAt',
			'updatedAt',
		],
		role: [
			'id',
			'name',
			'scope',
			'createdAt',
			'updatedAt',
		],
	}[table];
};
