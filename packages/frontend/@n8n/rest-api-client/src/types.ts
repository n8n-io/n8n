import type { RawAxiosRequestHeaders } from 'axios';

export interface IRestApiContext {
	baseUrl: string;
	pushRef: string;
}

export interface PublicApiContext {
	baseUrl: string;
	// Extra headers for every request made with this context.
	headers?: RawAxiosRequestHeaders;
}
