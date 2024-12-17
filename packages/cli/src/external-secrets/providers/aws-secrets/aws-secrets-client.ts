import * as aws4 from 'aws4';
import type { Request as Aws4Options } from 'aws4';
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

import type {
	AwsSecretsManagerContext,
	ConnectionTestResult,
	Secret,
	SecretsNamesPage,
	SecretsPage,
	AwsSecretsClientSettings,
} from './types';

export class AwsSecretsClient {
	private settings: AwsSecretsClientSettings = {
		region: '',
		host: '',
		url: '',
		accessKeyId: '',
		secretAccessKey: '',
	};

	constructor(settings: AwsSecretsManagerContext['settings']) {
		const { region, accessKeyId, secretAccessKey } = settings;

		this.settings = {
			region,
			host: `secretsmanager.${region}.amazonaws.com`,
			url: `https://secretsmanager.${region}.amazonaws.com`,
			accessKeyId,
			secretAccessKey,
		};
	}

	/**
	 * Check whether the client can connect to AWS Secrets Manager.
	 */
	async checkConnection(): ConnectionTestResult {
		try {
			await this.fetchSecretsNamesPage();
			return [true];
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			return [false, error.message];
		}
	}

	/**
	 * Fetch all secrets from AWS Secrets Manager.
	 */
	async fetchAllSecrets() {
		const secrets: Secret[] = [];

		const allSecretsNames = await this.fetchAllSecretsNames();

		const batches = this.batch(allSecretsNames);

		for (const batch of batches) {
			const page = await this.fetchSecretsPage(batch);

			secrets.push(
				...page.SecretValues.map((s) => ({ secretName: s.Name, secretValue: s.SecretString })),
			);
		}

		return secrets;
	}

	private batch<T>(arr: T[], size = 20): T[][] {
		return Array.from({ length: Math.ceil(arr.length / size) }, (_, index) =>
			arr.slice(index * size, (index + 1) * size),
		);
	}

	private toRequestOptions(
		action: 'ListSecrets' | 'BatchGetSecretValue',
		body: string,
	): Aws4Options {
		return {
			method: 'POST',
			service: 'secretsmanager',
			region: this.settings.region,
			host: this.settings.host,
			headers: {
				'X-Amz-Target': `secretsmanager.${action}`,
				'Content-Type': 'application/x-amz-json-1.1',
			},
			body,
		};
	}

	/**
	 * @doc https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_BatchGetSecretValue.html
	 */
	private async fetchSecretsPage(secretsNames: string[], nextToken?: string) {
		const body = JSON.stringify(
			nextToken
				? { SecretIdList: secretsNames, NextToken: nextToken }
				: { SecretIdList: secretsNames },
		);

		const options = this.toRequestOptions('BatchGetSecretValue', body);
		const { headers } = aws4.sign(options, this.settings);

		const config: AxiosRequestConfig = {
			method: 'POST',
			url: this.settings.url,
			headers,
			data: body,
		};

		const response = await axios.request<SecretsPage>(config);

		return response.data;
	}

	private async fetchAllSecretsNames() {
		const names: string[] = [];

		let nextToken: string | undefined;

		do {
			const page = await this.fetchSecretsNamesPage(nextToken);
			names.push(...page.SecretList.map((s) => s.Name));
			nextToken = page.NextToken;
		} while (nextToken);

		return names;
	}

	/**
	 * @doc https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_ListSecrets.html
	 */
	private async fetchSecretsNamesPage(nextToken?: string) {
		const body = JSON.stringify(nextToken ? { NextToken: nextToken } : {});

		const options = this.toRequestOptions('ListSecrets', body);
		const { headers } = aws4.sign(options, this.settings);

		const config: AxiosRequestConfig = {
			method: 'POST',
			url: this.settings.url,
			headers,
			data: body,
		};

		const response = await axios.request<SecretsNamesPage>(config);

		return response.data;
	}
}
