import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
} from 'n8n-core'
import { ICredentialDataDecryptedObject } from 'n8n-workflow'

export async function emeliaApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,
	body: object = {},
	qs: object = {},
	option: object = {}
) {
	const credentials = this.getCredentials('emeliaApi')
	const options = {
		headers: {
			Authorization: (credentials as ICredentialDataDecryptedObject)
				.apiKey,
		},
		method,
		body,
		qs,
		uri: `https://graphql.emelia.io${path}`,
		json: true,
	}
	try {
		if (this.helpers.request)
			return await this.helpers.request.call(this, options)
		else {
			return {}
		}
	} catch (error) {
		if (
			error.response &&
			error.response.body &&
			error.response.body.error
		) {
			const message = error.response.body.error
			throw new Error(
				`Emelia error response [${error.statusCode}]: ${message}`
			)
		}
		throw error
	}
}

export async function emeliaGrapqlRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	body: object = {}
) {
	const response = await emeliaApiRequest.call(this, 'POST', '/graphql', body)

	if (response.errors) {
		throw new Error(`Emelia error message: ${response.errors[0].message}`)
	}

	return response
}
