import { FindOneOptions } from "typeorm";
import { Db, ResponseHelper } from ".";

/**
 * Validate whether a tag name exists so that it cannot be used for a create operation.
 */
export async function validateName(name: string): Promise<void> | never {
	const findQuery = { where: { name } } as FindOneOptions;
	const result = await Db.collections.Tag!.findOne(findQuery);

	if (result) {
		throw new ResponseHelper.ResponseError('Tag name already exists.', undefined, 400);
	}
}

/**
 * Validate whether a tag ID exists so that it can be used for an update operation.
 */
export async function validateId(id: string): Promise<void> | never {
	const findQuery = { where: { id } } as FindOneOptions;
	const result = await Db.collections.Tag!.findOne(findQuery);

	if (!result) {
		throw new ResponseHelper.ResponseError(`Tag with ID ${id} does not exist.`, undefined, 400);
	}
}

/**
 * Validate whether a tag name has 1 to 24 characters.
 */
export function validateLength(name: string): void | never {
	if (name.length < 0 || name.length > 24) {
		throw new ResponseHelper.ResponseError('Tag name must be 1 to 24 characters long.', undefined, 400);
	}
}

/**
 * Validate whether the request body for a create/update operation has a `name` property.
 */
export function validateRequestBody({ name }: { name: string }): void | never {
	if (!name) {
		throw new ResponseHelper.ResponseError(`Property 'name' missing from request body.`, undefined, 400);
	}
}
