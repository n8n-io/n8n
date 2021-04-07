import { FindOneOptions } from "typeorm";
import { Db, ResponseHelper } from ".";

export async function nameExists(name: string) {
	const findQuery = { where: { name } } as FindOneOptions;
	const result = await Db.collections.Tag!.findOne(findQuery);

	return result !== undefined;
}

export async function idExists(id: string) {
	const findQuery = { where: { id } } as FindOneOptions;
	const result = await Db.collections.Tag!.findOne(findQuery);

	return result !== undefined;
}

export function validateLength(name: string) {
	if (name.length < 0 || name.length > 24) {
		throw new ResponseHelper.ResponseError('Tag name must be 1 to 24 characters long.', undefined, 400);
	}
}
