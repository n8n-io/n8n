/* eslint-disable @typescript-eslint/no-invalid-void-type */

import { Container } from '@n8n/di';
import type express from 'express';
import { validate } from 'jsonschema';
import { resolveDefaultVersion, type IDataObject } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';

import { getCredential, toJsonSchema } from './credentials.service';
import type { CredentialRequest } from '../../../types';

/**
 * Helper function to validate credential data against a credential type schema
 * @param credentialType - The credential type to validate against
 * @param data - The credential data to validate
 * @param res - Express response object
 * @param typeVersion - The credential's effective version. Drives `@version`
 *   gating in the generated schema.
 * @returns Express response with error message if validation fails, or undefined if valid
 */
function validateCredentialData(
	credentialType: string,
	data: IDataObject,
	res: express.Response,
	typeVersion: number,
): express.Response | void {
	const properties = Container.get(CredentialsHelper)
		.getCredentialsProperties(credentialType)
		.filter((property) => property.type !== 'hidden');

	const schema = toJsonSchema(properties, typeVersion);

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

	// Validate against the version a new credential will be persisted at —
	// the type's defaultVersion (RFC §7.5.1).
	const credentialType = Container.get(CredentialTypes).getByName(type);
	const typeVersion = resolveDefaultVersion(credentialType);

	const validationResult = validateCredentialData(type, data, res, typeVersion);
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
		const existingCredential = await getCredential(credentialId);
		if (!existingCredential) {
			return res.status(404).json({ message: 'Credential not found' });
		}

		if (type === undefined) {
			type = existingCredential.type;
		}

		// Resolve the version the row will be persisted at after §7.3's
		// recomputation runs: if the type is changing, use the new type's
		// defaultVersion; otherwise keep the existing typeVersion. Validating
		// type-B data against type-A's version, then persisting it at type-B's
		// default, would be incoherent.
		const typeVersion =
			type !== existingCredential.type
				? resolveDefaultVersion(Container.get(CredentialTypes).getByName(type))
				: (existingCredential.typeVersion ?? 1);

		// Validate data against type
		const validationResult = validateCredentialData(type, data, res, typeVersion);
		if (validationResult) {
			return validationResult;
		}
	}

	// If type is provided but data is not, check if type is changing
	if (type !== undefined && data === undefined) {
		const existingCredential = await getCredential(credentialId);
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
