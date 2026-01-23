/* eslint-disable @typescript-eslint/no-invalid-void-type */

import { Container } from '@n8n/di';
import type express from 'express';
import { validate } from 'jsonschema';
import type { IDataObject } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';

import { getCredentials, toJsonSchema } from './credentials.service';
import type { CredentialRequest } from '../../../types';

/**
 * Helper function to validate credential data against a credential type schema
 * @param credentialType - The credential type to validate against
 * @param data - The credential data to validate
 * @param res - Express response object
 * @returns Express response with error message if validation fails, or undefined if valid
 */
function validateCredentialData(
	credentialType: string,
	data: IDataObject,
	res: express.Response,
): express.Response | void {
	const properties = Container.get(CredentialsHelper)
		.getCredentialsProperties(credentialType)
		.filter((property) => property.type !== 'hidden');

	const schema = toJsonSchema(properties);

	const { valid, errors } = validate(data, schema, { nestedErrors: true });

	if (!valid) {
		return res.status(400).json({
			message: errors.map((error) => `request.body.data ${error.message}`).join(','),
		});
	}
}

export const validCredentialType = (
	req: CredentialRequest.Create,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	try {
		Container.get(CredentialTypes).getByName(req.body.type);
	} catch {
		return res.status(400).json({ message: 'req.body.type is not a known type' });
	}

	return next();
};

export const validCredentialsProperties = (
	req: CredentialRequest.Create,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	const { type, data } = req.body;

	const validationResult = validateCredentialData(type, data, res);
	if (validationResult) {
		return validationResult;
	}

	return next();
};

export const validCredentialTypeForUpdate = (
	req: CredentialRequest.Update,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	const { type } = req.body;

	// If type is provided, validate it
	if (type !== undefined) {
		try {
			Container.get(CredentialTypes).getByName(type);
		} catch {
			return res.status(400).json({ message: 'req.body.type is not a known type' });
		}
	}

	return next();
};

export const validCredentialsPropertiesForUpdate = async (
	req: CredentialRequest.Update,
	res: express.Response,
	next: express.NextFunction,
): Promise<express.Response | void> => {
	let { type } = req.body;
	const { data } = req.body;
	const { id: credentialId } = req.params;

	// Only validate if data is provided
	if (data !== undefined) {
		// Fetch existing credential to get type if not provided
		if (type === undefined) {
			const existingCredential = await getCredentials(credentialId);
			if (!existingCredential) {
				return res.status(404).json({ message: 'Credential not found' });
			}
			type = existingCredential.type;
		}

		// Validate data against type
		const validationResult = validateCredentialData(type, data, res);
		if (validationResult) {
			return validationResult;
		}
	}

	// If type is provided but data is not, check if type is changing
	if (type !== undefined && data === undefined) {
		const existingCredential = await getCredentials(credentialId);
		if (!existingCredential) {
			return res.status(404).json({ message: 'Credential not found' });
		}

		// If the type is changing, data must be provided
		if (existingCredential.type !== type) {
			return res.status(400).json({
				message:
					'req.body.data is required when changing credential type. The existing data cannot be used with the new type.',
			});
		}
	}

	return next();
};
