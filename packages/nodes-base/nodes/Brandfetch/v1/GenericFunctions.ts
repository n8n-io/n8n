import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	JsonObject,
	LegacyRequestOptions,
	RequestPath,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestPath, requestUrl } from 'n8n-workflow';

const ALLOWED_LOGO_HOSTNAME_SUFFIXES = ['.brandfetch.io', '.brandfetch.com'];

function assertSafeLogoUrl(this: IExecuteFunctions, rawUrl: unknown): string {
	if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Logo source URL is missing or invalid');
	}

	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		throw new NodeOperationError(this.getNode(), `Logo source URL is not a valid URL: ${rawUrl}`);
	}

	if (parsed.protocol !== 'https:') {
		throw new NodeOperationError(
			this.getNode(),
			`Logo source URL must use https (got ${parsed.protocol})`,
		);
	}

	const hostname = parsed.hostname.toLowerCase();
	const isAllowedHost = ALLOWED_LOGO_HOSTNAME_SUFFIXES.some(
		(suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
	);
	if (!isAllowedHost) {
		throw new NodeOperationError(
			this.getNode(),
			`Refusing to download logo from untrusted host: ${hostname}`,
		);
	}

	return parsed.toString();
}

export async function brandfetchApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: Pick<IRequestOptions, 'json' | 'encoding' | 'headers'> = {},
): Promise<any> {
	try {
		let options: LegacyRequestOptions = {
			method,
			qs,
			body,
			...(uri ? { url: uri } : { url: requestUrl`https://api.brandfetch.io/v2${resource}` }),
			json: true,
		};

		options = Object.assign({}, options, option);

		if (this.getNodeParameter('operation', 0) === 'logo' && options.json === false) {
			delete options.headers;
		}

		if (!Object.keys(body as IDataObject).length) {
			delete options.body;
		}
		if (!Object.keys(qs).length) {
			delete options.qs;
		}

		const response = await this.helpers.requestWithAuthentication.call(
			this,
			'brandfetchApi',
			options,
		);

		if (response.statusCode && response.statusCode !== 200) {
			throw new NodeApiError(this.getNode(), response as JsonObject);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function fetchAndPrepareBinaryData(
	this: IExecuteFunctions,
	imageType: string,
	imageFormat: string,
	logoFormats: IDataObject,
	domain: string,
	newItem: INodeExecutionData,
) {
	const safeUrl = assertSafeLogoUrl.call(this, logoFormats.src);

	const data = await brandfetchApiRequest.call(this, 'GET', requestPath``, {}, {}, safeUrl, {
		json: false,
		encoding: null,
	});

	newItem.binary![`${imageType}_${imageFormat}`] = await this.helpers.prepareBinaryData(
		Buffer.from(data),
		`${imageType}_${domain}.${imageFormat}`,
	);
}
