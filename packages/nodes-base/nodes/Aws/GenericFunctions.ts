import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { config } from 'aws-sdk';
import { OptionsWithUri } from 'request';


export async function awsConfigCredentials(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions): Promise<void> {
	const credentials = this.getCredentials('aws');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	config.update({
		region: `${credentials.region}`,
		accessKeyId: `${credentials.accessKeyId}`,
		secretAccessKey: `${credentials.secretAccessKey}`,
	});
}
