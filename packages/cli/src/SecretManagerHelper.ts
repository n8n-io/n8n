/* eslint-disable @typescript-eslint/naming-convention */
import axios, { AxiosResponse } from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import { v4 as uuid } from 'uuid';
import xml, { convertableToString } from 'xml2js';
import util from 'util';

const parseString = util.promisify(xml.parseString);

const client = axios.create();

const AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID';
const AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY';
const AWS_DEFAULT_REGION = 'AWS_DEFAULT_REGION';
const SECRET_MANAGER_SERVICE = 'secretsmanager';
const STS_SERVICE = 'sts';
const DEFAULT_REGION = 'us-east-1';
const REGION = process.env[AWS_DEFAULT_REGION] ?? DEFAULT_REGION;

interface SecretManagerBase {
	displayName: string;

	create(id: string, value: object | string): Promise<{ id: string }>;
	delete(id: string): Promise<{ id: string }>;
	update(id: string, value: object): Promise<{ id: string }>;
	get(id: string): Promise<{ id: string; data: object }>;
	isEnabled(): Promise<boolean>;
	canHandle(id: string): Promise<boolean>;
}

type CreateSecretResponse = {
	Name: string;
	ARN: string;
};

type GetSecretResponse = {
	ARN: string;
	CreatedDate: number;
	Name: string;
	SecretString: string;
	VersionId: string;
};

type DeleteSecretResponse = {
	ARN: string;
	DeletionDate: number;
	Name: string;
};

type UpdateSecretResponse = DeleteSecretResponse;

client.interceptors.request.use(
	aws4Interceptor(
		{
			region: process.env[AWS_DEFAULT_REGION] ?? DEFAULT_REGION,
		},
		{
			accessKeyId: process.env[AWS_ACCESS_KEY_ID] ?? '',
			secretAccessKey: process.env[AWS_SECRET_ACCESS_KEY] ?? '',
		},
	),
);

export class AwsSecretManager implements SecretManagerBase {
	displayName: 'AWS Secret Manager';

	#idKey = 'aws:';

	#hasBeenChecked = false;

	async canHandle(id: string): Promise<boolean> {
		return this.#hasBeenChecked && id.startsWith('aws') ? true : false;
	}

	async isEnabled() {
		const requiredEnvVariables = [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY];
		const missingEnvVariable = !requiredEnvVariables.every((key) => process.env[key] !== undefined);

		if (missingEnvVariable) return false;

		try {
			const response = (await client({
				method: 'POST',
				url: `https://${STS_SERVICE}.${REGION}.amazonaws.com/`,
				params: {
					Action: 'GetCallerIdentity',
					Version: '2011-06-15',
				},
				headers: {
					'Content-Type': 'application/x-amz-json-1.1',
				},
			})) as AxiosResponse<convertableToString>;

			(await parseString(response.data)) as {
				GetCallerIdentityResponse: { GetCallerIdentityResult: [] };
			};
		} catch (e) {
			return false;
		}

		this.#hasBeenChecked = true;
		return true;
	}

	async create(name: string, value: object | string): Promise<{ id: string }> {
		const response = (await client({
			method: 'POST',
			url: `https://${SECRET_MANAGER_SERVICE}.${REGION}.amazonaws.com/`,
			headers: {
				'X-Amz-Target': 'secretsmanager.CreateSecret',
				'Content-Type': 'application/x-amz-json-1.1',
			},
			data: {
				Name: name,
				SecretString: typeof value === 'string' ? value : JSON.stringify(value),
				ClientRequestToken: uuid(),
			},
		})) as AxiosResponse<CreateSecretResponse>;
		return { id: `${this.#idKey}${response.data.Name}` };
	}

	async get(id: string): Promise<{ id: string; data: object }> {
		const response = (await client({
			method: 'POST',
			url: `https://${SECRET_MANAGER_SERVICE}.${REGION}.amazonaws.com/`,
			headers: {
				'X-Amz-Target': 'secretsmanager.GetSecretValue',
				'Content-Type': 'application/x-amz-json-1.1',
			},
			data: {
				SecretId: id.replace(this.#idKey, ''),
			},
		})) as AxiosResponse<GetSecretResponse>;
		return {
			id: `${this.#idKey}${response.data.Name}`,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, n8n-local-rules/no-uncaught-json-parse
			data: JSON.parse(response.data.SecretString),
		};
	}

	async delete(id: string): Promise<{ id: string }> {
		const response = (await client({
			method: 'POST',
			url: `https://${SECRET_MANAGER_SERVICE}.${REGION}.amazonaws.com/`,
			headers: {
				'X-Amz-Target': 'secretsmanager.DeleteSecret',
				'Content-Type': 'application/x-amz-json-1.1',
			},
			data: {
				SecretId: id.replace(this.#idKey, ''),
			},
		})) as AxiosResponse<DeleteSecretResponse>;
		return { id: `${this.#idKey}${response.data.Name}` };
	}

	async update(id: string, value: object): Promise<{ id: string }> {
		const response = (await client({
			method: 'POST',
			url: `https://${SECRET_MANAGER_SERVICE}.${REGION}.amazonaws.com/`,
			headers: {
				'X-Amz-Target': 'secretsmanager.UpdateSecret',
				'Content-Type': 'application/x-amz-json-1.1',
			},
			data: {
				SecretId: id.replace(this.#idKey, ''),
				SecretString: JSON.stringify(value),
				ClientRequestToken: uuid(),
			},
		})) as AxiosResponse<UpdateSecretResponse>;
		return { id: `${this.#idKey}${response.data.Name}` };
	}
}
