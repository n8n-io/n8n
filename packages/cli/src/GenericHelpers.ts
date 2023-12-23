import type express from 'express';
import { validate } from 'class-validator';
import config from '@/config';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { TagEntity } from '@db/entities/TagEntity';
import type { User } from '@db/entities/User';
import type { UserUpdatePayload } from '@/requests';
import { BadRequestError } from './errors/response-errors/bad-request.error';

/**
 * Returns the base URL n8n is reachable from
 */
export function getBaseUrl(): string {
	const protocol = config.getEnv('protocol');
	const host = config.getEnv('host');
	const port = config.getEnv('port');
	const path = config.getEnv('path');

	if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
		return `${protocol}://${host}${path}`;
	}
	return `${protocol}://${host}:${port}${path}`;
}

/**
 * Returns the session id if one is set
 */
export function getSessionId(req: express.Request): string | undefined {
	return req.headers.sessionid as string | undefined;
}

export async function validateEntity(
	entity: WorkflowEntity | CredentialsEntity | TagEntity | User | UserUpdatePayload,
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
