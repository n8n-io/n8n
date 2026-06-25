import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';

import { digestAuthAxiosConfig } from './utils';

export async function invokeAxios(axiosConfig: AxiosRequestConfig, authSendImmediately?: boolean) {
	try {
		return await axios(axiosConfig);
	} catch (error) {
		if (authSendImmediately !== false || !(error instanceof axios.AxiosError)) {
			throw error;
		}
		// for digest-auth
		const { response } = error;
		const wwwAuthenticate: unknown = response?.headers['www-authenticate'];
		if (
			response?.status !== 401 ||
			typeof wwwAuthenticate !== 'string' ||
			!wwwAuthenticate.includes('nonce')
		) {
			throw error;
		}
		const { auth } = axiosConfig;
		delete axiosConfig.auth;
		axiosConfig = digestAuthAxiosConfig(axiosConfig, response, auth);
		return await axios(axiosConfig);
	}
}
