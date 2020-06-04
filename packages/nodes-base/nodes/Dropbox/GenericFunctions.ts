import { IExecuteFunctions, IHookFunctions } from 'n8n-core';
import { OptionsWithUri } from 'request';

/**
 * Make an API request to Dropbox
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function dropboxApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: object, headers?: object, encoding?: string | null): Promise<any> {// tslint:disable-line:no-any

	const options: OptionsWithUri = {
		headers,
		method,
		body,
		uri: endpoint,
		json: true,
		encoding
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (encoding !== null) {
		delete options.encoding;
  }

	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

	console.log(options);

	try {
		if (authenticationMethod === 'accessToken') {
			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth.call(this, 'dropboxOAuth2Api', options);
		}
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Dropbox credentials are not valid!');
		}

		if (error.error && error.error.error_summary) {
			// Try to return the error prettier
			throw new Error(
				`Dropbox error response [${error.statusCode}]: ${error.error.error_summary}`
			);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}
