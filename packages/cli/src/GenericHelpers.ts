import { ValidationError, validate } from 'class-validator';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { TagEntity } from '@db/entities/TagEntity';
import type { User } from '@db/entities/User';
import type {
	UserRoleChangePayload,
	UserSettingsUpdatePayload,
	UserUpdatePayload,
} from '@/requests';
import { BadRequestError } from './errors/response-errors/bad-request.error';
import { NoXss } from '@/validators/no-xss.validator';

export async function validateEntity(
	entity:
		| WorkflowEntity
		| CredentialsEntity
		| TagEntity
		| User
		| UserUpdatePayload
		| UserRoleChangePayload
		| UserSettingsUpdatePayload,
): Promise<void> {
	const errors = await validate(entity);

	const errorMessages = errors
		.reduce<string[]>((acc, cur) => {
			if (!cur.constraints) return acc;
			acc.push(...Object.values(cur.constraints));
			return acc;
		}, [])
		.join(' | ');

	if (errorMessages) {
		throw new BadRequestError(errorMessages);
	}
}

export const DEFAULT_EXECUTIONS_GET_ALL_LIMIT = 20;

class StringWithNoXss {
	@NoXss()
	value: string;

	constructor(value: string) {
		this.value = value;
	}
}

// Temporary solution until we implement payload validation middleware
export async function validateRecordNoXss(record: Record<string, string>) {
	const errors: ValidationError[] = [];

	for (const [key, value] of Object.entries(record)) {
		const stringWithNoXss = new StringWithNoXss(value);
		const validationErrors = await validate(stringWithNoXss);

		if (validationErrors.length > 0) {
			const error = new ValidationError();
			error.property = key;
			error.constraints = validationErrors[0].constraints;
			errors.push(error);
		}
	}

	if (errors.length > 0) {
		const errorMessages = errors
			.map((error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`)
			.join(' | ');

		throw new BadRequestError(errorMessages);
	}
}
