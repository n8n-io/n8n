import type {
	IHttpRequestOptions,
	IRequestOptions,
	LegacyRequestOptions,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';

const isTarget = (value: unknown): value is RequestPath | RequestUrl =>
	typeof value === 'object' && value !== null;

const hasStringUrl = (
	requestOptions: IHttpRequestOptions | WithRequestTarget<IHttpRequestOptions>,
): requestOptions is IHttpRequestOptions => !isTarget(requestOptions.url);

const hasStringTargets = (
	requestOptions: LegacyRequestOptions,
	// oxlint-disable-next-line typescript/no-deprecated
): requestOptions is IRequestOptions =>
	!isTarget(requestOptions.url) && !isTarget(requestOptions.uri);

export function toHttpRequestOptions(
	requestOptions: IHttpRequestOptions | WithRequestTarget<IHttpRequestOptions>,
): IHttpRequestOptions {
	if (hasStringUrl(requestOptions)) return requestOptions;
	return { ...requestOptions, url: requestOptions.url.toString() };
}

// oxlint-disable-next-line typescript/no-deprecated
export function toLegacyRequestOptions(requestOptions: LegacyRequestOptions): IRequestOptions {
	if (hasStringTargets(requestOptions)) return requestOptions;
	const { url, uri, ...rest } = requestOptions;
	return {
		...rest,
		...(url !== undefined && { url: isTarget(url) ? url.toString() : url }),
		...(uri !== undefined && { uri: isTarget(uri) ? uri.toString() : uri }),
	};
}
