/* eslint-disable consistent-return */
import express = require('express');
import { CredentialRequest } from '../../../types';
import { validateCredentialsProperties } from './credentials.service';

export const validCredentialsProperties = async (
	req: CredentialRequest.Create,
	res: express.Response,
	next: express.NextFunction,
): Promise<any> => {
	const { type, data } = req.body;
	const formatError = (propertyName: string) => {
		return `request.body.data should have required property '${propertyName}'`;
	};
	const missingProperties = validateCredentialsProperties(type, data);
	if (missingProperties.length) {
		return res.status(400).json({
			message: missingProperties.map(formatError).join(','),
		});
	}
	next();
};
