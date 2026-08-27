import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';

import { digestAuthAxiosConfig } from './utils';

export async function invokeAxios(axiosConfig: AxiosRequestConfig, authSendImmediately?: boolean) {
	// For challenge-response schemes (sendImmediately === false, e.g. Digest), the first
	// request must go out unauthenticated so the server issues its challenge. Withhold the
	// credentials here and keep a copy to answer the challenge with.
	const challengeAuth = authSendImmediately === false ? axiosConfig.auth : undefined;
	if (challengeAuth) {
		delete axiosConfig.auth;
	}
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
		axiosConfig = digestAuthAxiosConfig(axiosConfig, response, challengeAuth);
		return await axios(axiosConfig);
	}
}
