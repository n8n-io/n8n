import express = require('express');
import { CredentialsHelper } from '../../../../CredentialsHelper';
import { CredentialTypes } from '../../../../CredentialTypes';
import { CredentialTypeRequest } from '../../../types';

import { authorize } from '../../shared/midlewares/global.midleware';

export = {
	getCredentialType: [
		authorize(['owner', 'member']),
		async (req: CredentialTypeRequest.Get, res: express.Response): Promise<express.Response> => {
			const { credentialTypeId } = req.params;

			console.log(credentialTypeId);

			try {
				CredentialTypes().getByName(credentialTypeId);
			} catch (error) {
				return res.status(404).json();
			}

			const schema = new CredentialsHelper('').getCredentialsProperties(credentialTypeId);

			return res.json(schema);
		},
	],
};
