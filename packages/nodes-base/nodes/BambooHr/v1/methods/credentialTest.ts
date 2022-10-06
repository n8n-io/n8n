import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IHttpRequestOptions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

export async function bambooHrApiCredentialTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	try {
		await validateCredentials.call(this, credential.data as ICredentialDataDecryptedObject);
	} catch (error) {
		return {
			status: 'Error',
			message: 'The API Key included in the request is invalid',
		};
	}

	return {
		status: 'OK',
		message: 'Connection successful!',
	} as INodeCredentialTestResult;
}

async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = decryptedCredentials;

	const { subdomain, apiKey } = credentials as {
		subdomain: string;
		apiKey: string;
	};

	const options: IHttpRequestOptions = {
		method: 'GET',
		auth: {
			username: apiKey as string,
			password: 'x',
		},
		url: `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/employees/directory`,
	};

	return await this.helpers.request(options);
}
