import type { RawAxiosRequestHeaders } from 'axios';

export interface IRestApiContext {
	baseUrl: string;
	pushRef: string;
}

export interface PublicApiContext {
	baseUrl: string;
	headers?: RawAxiosRequestHeaders;
}
