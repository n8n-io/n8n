import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import axios, { type AxiosInstance } from 'axios';
import type { INodeProperties } from 'n8n-workflow';

import { DOCS_HELP_NOTICE, EXTERNAL_SECRETS_NAME_REGEX } from '../constants';
import type { SecretsProvider, SecretsProviderSettings, SecretsProviderState } from '../types';

interface AkeylessSettings {
	authMethod?: 'access_key' | 'token';
	accessId?: string;
	accessKey?: string;
	token?: string;
	serverUrl?: string;
}

interface AkeylessAuthResponse {
	token?: string;
	error?: string;
}

interface AkeylessGetSecretValueResponse {
	[key: string]: string | undefined;
	error?: string;
}

interface AkeylessGetDynamicSecretValueResponse {
	[key: string]: string | number | boolean | object | undefined;
	error?: string;
}

interface AkeylessGetRotatedSecretValueResponse {
	[key: string]: string | undefined;
	error?: string;
}

export class AkeylessProvider implements SecretsProvider {
	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
		{
			displayName: 'Authentication Method',
			name: 'authMethod',
			type: 'options',
			options: [
				{
					name: 'Access Key',
					value: 'access_key',
					description: 'Authenticate using Access ID and Access Key credentials',
				},
				{
					name: 'Token (Direct)',
					value: 'token',
					description: 'Use a token starting with "t-" directly',
				},
			],
			default: 'access_key',
			required: true,
			noDataExpression: true,
		},
		{
			displayName: 'Access ID',
			name: 'accessId',
			type: 'string',
			hint: 'Your Akeyless Access ID',
			default: '',
			required: false,
			placeholder: 'Enter your Access ID',
			noDataExpression: true,
			displayOptions: {
				show: {
					authMethod: ['access_key'],
				},
			},
		},
		{
			displayName: 'Access Key',
			name: 'accessKey',
			type: 'string',
			hint: 'Your Akeyless Access Key',
			default: '',
			required: false,
			placeholder: 'Enter your Access Key',
			noDataExpression: true,
			typeOptions: { password: true },
			displayOptions: {
				show: {
					authMethod: ['access_key'],
				},
			},
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			hint: 'Your Akeyless authentication token (starts with "t-")',
			default: '',
			required: false,
			placeholder: 'Enter your token (starts with "t-")',
			noDataExpression: true,
			typeOptions: { password: true },
			displayOptions: {
				show: {
					authMethod: ['token'],
				},
			},
		},
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			hint: 'Akeyless server URL. Leave empty for default (https://api.akeyless.io)',
			default: '',
			required: false,
			placeholder: 'Enter server URL (optional)',
			noDataExpression: true,
		},
	];

	displayName = 'Akeyless';

	name = 'akeyless';

	state: SecretsProviderState = 'initializing';

	private cachedSecrets: Record<string, string | object> = {};

	private settings: AkeylessSettings;

	private httpClient: AxiosInstance | null = null;

	private baseUrl: string = 'https://api.akeyless.io';

	private secretFetchPromises = new Map<string, Promise<string | object | undefined>>();

	private fetchGeneration = 0;

	private isRecordOfUnknown(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	private isUnknownArray(value: unknown): value is unknown[] {
		return Array.isArray(value);
	}

	constructor(private readonly logger = Container.get(Logger)) {
		this.logger = this.logger.scoped('external-secrets');
	}

	private isBase64Like(value: string): boolean {
		return value.length > 20 && /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0;
	}

	private tryDecodeBase64Json(base64Value: string): object | undefined {
		try {
			const decoded = Buffer.from(base64Value, 'base64').toString('utf-8');
			const decodedTrimmed = decoded.trim();

			if (!decodedTrimmed.startsWith('{') && !decodedTrimmed.startsWith('[')) {
				return undefined;
			}

			return this.parseJsonValue(decoded, 'base64');
		} catch (error) {
			this.logger.debug('Base64 decoding failed or decoded value is not JSON', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	private parseJsonValue(
		jsonString: string,
		source: 'direct' | 'base64' = 'direct',
	): object | unknown[] | undefined {
		try {
			const parsed: unknown = JSON.parse(jsonString);

			if (this.isRecordOfUnknown(parsed)) {
				const sanitizedObject: Record<string, unknown> = {};
				for (const [key, value] of Object.entries(parsed)) {
					if (typeof value === 'string') {
						sanitizedObject[key] = this.sanitizeString(value);
					} else {
						sanitizedObject[key] = value;
					}
				}
				const logMessage =
					source === 'base64'
						? 'Successfully decoded base64 and parsed as JSON object'
						: 'Successfully parsed secret value as JSON object';
				this.logger.debug(logMessage, {
					keys: Object.keys(sanitizedObject),
				});
				return sanitizedObject;
			}

			if (this.isUnknownArray(parsed)) {
				const logMessage =
					source === 'base64'
						? 'Successfully decoded base64 and parsed as JSON array'
						: 'Successfully parsed secret value as JSON array';
				this.logger.debug(logMessage);
				return parsed;
			}

			return undefined;
		} catch (error) {
			if (source === 'direct') {
				this.logger.debug('Failed to parse secret value as JSON, returning as string', {
					error: error instanceof Error ? error.message : String(error),
					valuePreview: jsonString.substring(0, 100),
				});
			}
			return undefined;
		}
	}

	private sanitizeString(value: string): string {
		let cleaned = value
			.replace(/[\u200B-\u200D\uFEFF]/g, '')
			.replace(/\u00A0/g, '')
			.replace(/[\u2028\u2029\u202F\u2060\u00AD]/g, '')
			.replace(/\r/g, '')
			.trim();

		if (cleaned.length > 20 && !/[{}\[\]:,]/.test(cleaned) && !/\n/.test(cleaned)) {
			cleaned = cleaned.replace(/\s+/g, '');
		}

		return cleaned;
	}

	private parseSecretValue(value: string): string | object {
		if (typeof value !== 'string' || value.trim().length === 0) {
			return value;
		}

		const trimmed = this.sanitizeString(value);

		if (this.isBase64Like(trimmed)) {
			const decodedResult = this.tryDecodeBase64Json(trimmed);
			if (decodedResult !== undefined) {
				return decodedResult;
			}
		}

		if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
			const parsedResult = this.parseJsonValue(trimmed, 'direct');
			if (parsedResult !== undefined) {
				return parsedResult;
			}
		}

		return trimmed;
	}

	async init(settings: SecretsProviderSettings): Promise<void> {
		const raw = settings.settings;
		const isValid = (v: unknown): v is AkeylessSettings =>
			this.isRecordOfUnknown(v) &&
			(['authMethod', 'accessId', 'accessKey', 'token', 'serverUrl'] as const).every(
				(k) => v[k] === undefined || typeof v[k] === 'string',
			);
		this.settings = isValid(raw) ? raw : {};
		this.baseUrl = (this.settings?.serverUrl?.trim() ?? 'https://api.akeyless.io').replace(
			/\/$/,
			'',
		);
		this.httpClient = axios.create({
			baseURL: this.baseUrl,
			headers: {
				'Content-Type': 'application/json',
			},
		});
	}

	async connect(): Promise<void> {
		try {
			await this.authenticate();
			const [testPassed, testError] = await this.test();
			if (testPassed) {
				this.state = 'connected';
				this.logger.debug('Akeyless provider connected successfully');
			} else {
				this.state = 'error';
				throw new Error(testError ?? 'Connection test failed');
			}
		} catch (error) {
			this.logger.error('Failed to connect to Akeyless', {
				error: error instanceof Error ? error.message : String(error),
			});
			this.state = 'error';
			throw error;
		}
	}

	async disconnect(): Promise<void> {
		// Invalidate any pending fetches and prevent stale cache writes
		this.fetchGeneration++;
		this.secretFetchPromises.clear();
		this.cachedSecrets = {};
		this.httpClient = null;
		this.state = 'initializing';
	}

	private initializeHttpClient(): void {
		if (!this.httpClient) {
			this.baseUrl = (this.settings?.serverUrl?.trim() ?? 'https://api.akeyless.io').replace(
				/\/$/,
				'',
			);
			this.httpClient = axios.create({
				baseURL: this.baseUrl,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}
	}

	private useTokenAuthentication(): string {
		if (!this.settings?.token) {
			throw new Error('Token is required when using Token authentication method');
		}

		if (!this.settings.token.startsWith('t-')) {
			this.logger.warn('Token does not start with "t-", but continuing anyway');
		}

		this.logger.debug('Using provided token directly for authentication');
		return this.settings.token;
	}

	private extractAuthErrorMessage(error: unknown): string {
		if (axios.isAxiosError(error) && error.response?.data) {
			return JSON.stringify(error.response.data);
		}
		if (error instanceof Error) {
			return error.message;
		}
		return String(error);
	}

	private async authenticateWithAccessKey(): Promise<string> {
		if (!this.settings?.accessId || !this.settings?.accessKey) {
			throw new Error('Access ID and Access Key are required for Access Key authentication');
		}

		this.initializeHttpClient();

		if (!this.httpClient) {
			throw new Error('HTTP client not initialized');
		}

		try {
			const response = await this.httpClient.post<AkeylessAuthResponse>('/auth', {
				'access-type': 'access_key',
				'access-id': this.settings.accessId,
				'access-key': this.settings.accessKey,
				json: false,
			});

			if (!response.data.token) {
				throw new Error(response.data.error ?? 'No token received from Akeyless');
			}

			return response.data.token;
		} catch (error) {
			const errorMessage = this.extractAuthErrorMessage(error);
			this.logger.error('Akeyless API authentication failed', {
				error: errorMessage,
				accessId: this.settings.accessId,
			});
			throw new Error(`Akeyless authentication failed: ${errorMessage}`);
		}
	}

	async authenticate(): Promise<string> {
		const authMethod = this.settings?.authMethod ?? 'access_key';

		if (authMethod === 'token') {
			return this.useTokenAuthentication();
		}

		return await this.authenticateWithAccessKey();
	}

	async update(): Promise<void> {
		this.logger.debug('Akeyless provider uses on-demand secret fetching');
	}

	private findSecretInResponse(
		response: Record<string, unknown> & { error?: string },
		secretName: string,
		normalizedName: string,
	): string | undefined {
		const direct = response[normalizedName];
		if (typeof direct === 'string') return direct;

		const nameWithoutSlash = normalizedName.startsWith('/')
			? normalizedName.substring(1)
			: normalizedName;
		const withoutSlash = response[nameWithoutSlash];
		if (typeof withoutSlash === 'string') return withoutSlash;

		for (const [key, value] of Object.entries(response)) {
			if (key === 'error' || typeof value !== 'string') {
				continue;
			}

			const keyWithoutSlash = key.startsWith('/') ? key.substring(1) : key;
			const nameWithoutSlash = normalizedName.startsWith('/')
				? normalizedName.substring(1)
				: normalizedName;

			if (
				key === normalizedName ||
				key === secretName ||
				keyWithoutSlash === nameWithoutSlash ||
				keyWithoutSlash === secretName
			) {
				this.cachedSecrets[key] = value;
				this.cachedSecrets[normalizedName] = value;
				this.cachedSecrets[secretName] = value;
				if (key.startsWith('/')) {
					this.cachedSecrets[key.substring(1)] = value;
				} else {
					this.cachedSecrets[`/${key}`] = value;
				}
				this.logger.debug(`Found secret "${secretName}" in response with key "${key}"`);
				return value;
			}
		}

		return undefined;
	}

	private processSecretResponse(
		responseData:
			| AkeylessGetSecretValueResponse
			| AkeylessGetDynamicSecretValueResponse
			| AkeylessGetRotatedSecretValueResponse,
		secretName: string,
		normalizedName: string,
	): string | object | undefined {
		if (responseData.error) {
			this.logger.warn(`Failed to fetch secret "${secretName}": ${responseData.error}`, {
				normalizedName,
				responseKeys: Object.keys(responseData).filter((k) => k !== 'error'),
			});
			return undefined;
		}

		this.logger.debug(`Secret fetch response for "${secretName}"`, {
			responseKeys: Object.keys(responseData).filter((k) => k !== 'error'),
		});

		if (typeof responseData === 'object' && responseData !== null) {
			const { error: _, ...dataWithoutError } = responseData;

			const keys = Object.keys(dataWithoutError);
			if (keys.length === 1) {
				const value = dataWithoutError[keys[0]];
				if (typeof value === 'string') {
					const parsed = this.parseSecretValue(value);
					return parsed;
				}
				if (typeof value === 'object' && value !== null) {
					return value;
				}
				return { value };
			}

			return this.processMultiKeyResponse(dataWithoutError);
		}
		const secretValue = this.findSecretInResponse(responseData, secretName, normalizedName);

		if (typeof secretValue === 'string') {
			this.logger.debug(`Raw secret value received for "${secretName}"`, {
				valueLength: secretValue.length,
				valuePreview: secretValue.substring(0, 200),
				hasNewlines: secretValue.includes('\n'),
				hasEscapedNewlines: secretValue.includes('\\n'),
			});

			return this.parseSecretValue(secretValue);
		}

		if (typeof secretValue === 'object' && secretValue !== null) {
			return secretValue;
		}

		this.logger.warn(
			`Secret "${secretName}" not found in API response. Available keys: ${Object.keys(responseData)
				.filter((k) => k !== 'error')
				.join(', ')}. Full response: ${JSON.stringify(responseData)}`,
		);
		return undefined;
	}

	private processMultiKeyResponse(
		dataWithoutError: Record<string, unknown>,
	): string | Record<string, unknown> {
		const keys = Object.keys(dataWithoutError);
		const processedData: Record<string, unknown> = { ...dataWithoutError };
		let allValuesAreSamePlainString = true;
		let firstPlainStringValue: string | undefined = undefined;
		let hasJsonObject = false;

		for (const [key, value] of Object.entries(dataWithoutError)) {
			if (typeof value === 'string') {
				const parsed = this.parseSecretValue(value);
				if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
					processedData[key] = parsed;
					hasJsonObject = true;
					allValuesAreSamePlainString = false;
				} else {
					processedData[key] = parsed;
					if (firstPlainStringValue === undefined && typeof parsed === 'string') {
						firstPlainStringValue = parsed;
					} else if (firstPlainStringValue !== parsed) {
						allValuesAreSamePlainString = false;
					}
				}
			} else {
				allValuesAreSamePlainString = false;
			}
		}

		if (
			allValuesAreSamePlainString &&
			firstPlainStringValue !== undefined &&
			!hasJsonObject &&
			keys.length > 1
		) {
			this.logger.debug(
				`All ${keys.length} keys have same plain string value, returning string directly`,
			);
			return firstPlainStringValue;
		}

		return processedData;
	}

	private async tryFetchStaticSecret(
		secretName: string,
		normalizedName: string,
		namesToTry: string[],
		token: string,
	): Promise<string | object | undefined> {
		try {
			const staticSecretResponse = await this.httpClient!.post<AkeylessGetSecretValueResponse>(
				'/get-secret-value',
				{
					names: namesToTry,
					token,
					accessibility: 'regular',
					'ignore-cache': 'false',
					json: false,
				},
			);

			const processedValue = this.processSecretResponse(
				staticSecretResponse.data,
				secretName,
				normalizedName,
			);

			if (processedValue !== undefined) {
				this.cacheSecretValue(secretName, normalizedName, processedValue);
				this.logger.debug(`Successfully fetched static secret "${secretName}"`);
				return processedValue;
			}

			this.logger.debug(`Static secret "${secretName}" not found, trying dynamic secret endpoint`);
			return undefined;
		} catch (staticError) {
			this.logger.debug(
				`Static secret fetch failed for "${secretName}", trying dynamic secret endpoint`,
				{
					error: staticError instanceof Error ? staticError.message : String(staticError),
				},
			);
			return undefined;
		}
	}

	private async tryFetchDynamicSecret(
		secretName: string,
		normalizedName: string,
		token: string,
	): Promise<string | object | undefined> {
		const nameToFetch = normalizedName.startsWith('/') ? normalizedName : `/${normalizedName}`;

		try {
			const dynamicSecretResponse =
				await this.httpClient!.post<AkeylessGetDynamicSecretValueResponse>(
					'/get-dynamic-secret-value',
					{
						name: nameToFetch,
						token,
						json: false,
						timeout: 15,
					},
				);

			const processedValue = this.processSecretResponse(
				dynamicSecretResponse.data,
				secretName,
				normalizedName,
			);

			if (processedValue !== undefined) {
				this.cacheSecretValue(secretName, normalizedName, processedValue);
				this.logger.debug(`Successfully fetched dynamic secret "${secretName}"`);
				return processedValue;
			}

			this.logger.debug(`Dynamic secret "${secretName}" not found`);
			return undefined;
		} catch (dynamicError) {
			this.logger.debug(`Dynamic secret fetch also failed for "${secretName}"`, {
				error: dynamicError instanceof Error ? dynamicError.message : String(dynamicError),
			});
			return undefined;
		}
	}

	private async tryFetchRotatedSecret(
		secretName: string,
		normalizedName: string,
		namesToTry: string[],
		token: string,
	): Promise<string | object | undefined> {
		for (const nameToTry of namesToTry) {
			try {
				const rotatedSecretResponse =
					await this.httpClient!.post<AkeylessGetRotatedSecretValueResponse>(
						'/get-rotated-secret-value',
						{
							names: nameToTry,
							token,
							'ignore-cache': 'false',
							json: false,
						},
					);

				const processedValue = this.processSecretResponse(
					rotatedSecretResponse.data,
					secretName,
					normalizedName,
				);

				if (processedValue !== undefined) {
					this.cacheSecretValue(secretName, normalizedName, processedValue);
					this.logger.debug(`Successfully fetched rotated secret "${secretName}"`);
					return processedValue;
				}
			} catch (rotatedError) {
				this.logger.debug(
					`Rotated secret fetch failed for "${secretName}" with name "${nameToTry}"`,
					{
						error: rotatedError instanceof Error ? rotatedError.message : String(rotatedError),
					},
				);
				continue;
			}
		}

		this.logger.debug(`Rotated secret "${secretName}" not found with any name variation`);
		return undefined;
	}

	private async fetchSecretByName(secretName: string): Promise<string | object | undefined> {
		const normalizedName = secretName.startsWith('/') ? secretName : `/${secretName}`;

		try {
			const token = await this.authenticate();

			if (!this.httpClient) {
				throw new Error('HTTP client not initialized');
			}

			this.logger.debug(`Fetching secret "${secretName}" (normalized: "${normalizedName}")`);

			const namesToTry = [
				normalizedName,
				secretName,
				normalizedName.startsWith('/') ? normalizedName.substring(1) : normalizedName,
				secretName.startsWith('/') ? secretName.substring(1) : secretName,
			].filter((name, index, arr) => arr.indexOf(name) === index);

			const staticResult = await this.tryFetchStaticSecret(
				secretName,
				normalizedName,
				namesToTry,
				token,
			);
			if (staticResult !== undefined) {
				return staticResult;
			}

			const dynamicResult = await this.tryFetchDynamicSecret(secretName, normalizedName, token);
			if (dynamicResult !== undefined) {
				return dynamicResult;
			}

			const rotatedResult = await this.tryFetchRotatedSecret(
				secretName,
				normalizedName,
				namesToTry,
				token,
			);
			if (rotatedResult !== undefined) {
				return rotatedResult;
			}

			this.logger.warn(`Secret "${secretName}" not found in static, dynamic, or rotated endpoints`);
			return undefined;
		} catch (error) {
			const errorDetails: Record<string, unknown> = {
				error: error instanceof Error ? error.message : String(error),
			};

			if (axios.isAxiosError(error)) {
				errorDetails.status = error.response?.status;
				errorDetails.statusText = error.response?.statusText;
				errorDetails.responseData = error.response?.data;
				errorDetails.url = error.config?.url;
				errorDetails.method = error.config?.method;
			}

			if (error instanceof Error && error.stack) {
				errorDetails.stack = error.stack;
			}

			this.logger.error(`Error fetching secret "${secretName}" via API`, errorDetails);
			return undefined;
		}
	}

	private cacheSecretValue(
		secretName: string,
		normalizedName: string,
		value: string | object,
	): void {
		this.cachedSecrets[normalizedName] = value;
		this.cachedSecrets[secretName] = value;
		if (normalizedName.startsWith('/')) {
			this.cachedSecrets[normalizedName.substring(1)] = value;
		} else {
			this.cachedSecrets[`/${normalizedName}`] = value;
		}
		if (secretName.startsWith('/')) {
			this.cachedSecrets[secretName.substring(1)] = value;
		} else {
			this.cachedSecrets[`/${secretName}`] = value;
		}

		this.logger.debug(`Cached secret "${secretName}"`, {
			isObject: typeof value === 'object' && value !== null,
			isString: typeof value === 'string',
			keys:
				typeof value === 'object' && value !== null && !Array.isArray(value)
					? Object.keys(value)
					: undefined,
		});
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		try {
			const token = await this.authenticate();
			return token ? [true] : [false, 'No token received'];
		} catch (error) {
			return [false, error instanceof Error ? error.message : String(error)];
		}
	}

	getSecret(name: string): unknown {
		let secretValue: string | object | undefined = this.cachedSecrets[name];
		if (secretValue === undefined && name.startsWith('/')) {
			secretValue = this.cachedSecrets[name.substring(1)];
		}
		if (secretValue === undefined && !name.startsWith('/')) {
			secretValue = this.cachedSecrets[`/${name}`];
		}

		if (secretValue === undefined && this.state === 'connected') {
			const canonicalKey = name.startsWith('/') ? name.substring(1) : name;
			let fetchPromise = this.secretFetchPromises.get(canonicalKey);

			if (!fetchPromise) {
				fetchPromise = this.fetchSecretByName(name);
				this.secretFetchPromises.set(canonicalKey, fetchPromise);

				const generationAtCreation = this.fetchGeneration;
				fetchPromise
					.then((value) => {
						// Skip cache updates if provider was disconnected/reinitialized
						if (
							value !== undefined &&
							generationAtCreation === this.fetchGeneration &&
							this.state === 'connected'
						) {
							this.cachedSecrets[name] = value;
							if (name.startsWith('/')) {
								this.cachedSecrets[name.substring(1)] = value;
							} else {
								this.cachedSecrets[`/${name}`] = value;
							}
						}
						this.secretFetchPromises.delete(canonicalKey);
					})
					.catch(() => {
						this.secretFetchPromises.delete(canonicalKey);
					});
			}

			this.logger.debug(`Secret "${name}" not in cache, fetching from Akeyless...`);
			return undefined;
		}

		if (secretValue !== undefined) {
			if (typeof secretValue !== 'string') {
				this.logger.debug(`Returning secret "${name}" as object`, {
					keys: Object.keys(secretValue),
				});
			}
		}

		return secretValue;
	}

	getSecretNames(): string[] {
		const allNames = Object.keys(this.cachedSecrets).filter((k) =>
			EXTERNAL_SECRETS_NAME_REGEX.test(k),
		);
		const namesWithoutSlash = allNames
			.filter((k) => k.startsWith('/'))
			.map((k) => k.substring(1))
			.filter((k) => EXTERNAL_SECRETS_NAME_REGEX.test(k));
		return Array.from(new Set([...allNames, ...namesWithoutSlash]));
	}

	hasSecret(name: string): boolean {
		if (
			name in this.cachedSecrets ||
			(name.startsWith('/') && name.substring(1) in this.cachedSecrets) ||
			(!name.startsWith('/') && `/${name}` in this.cachedSecrets)
		) {
			return true;
		}

		if (this.state === 'connected' && EXTERNAL_SECRETS_NAME_REGEX.test(name)) {
			return true;
		}

		return false;
	}
}
