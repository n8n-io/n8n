/* eslint-disable @typescript-eslint/naming-convention */
import axios, { AxiosResponse } from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import { v4 as uuid } from 'uuid';

const client = axios.create();

const AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID';
const AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY';
const AWS_DEFAULT_REGION = 'AWS_DEFAULT_REGION';
const SECRET_MANAGER_SERVICE = 'secretsmanager';
const DEFAULT_REGION = 'us-east-1';
const REGION = process.env[AWS_DEFAULT_REGION] ?? DEFAULT_REGION;

interface SecretManagerBase {
	displayName: string;

	create(id: string, value: object): Promise<{ id: string }>;
	delete(id: string): Promise<{ id: string }>;
	update(id: string, value: object): Promise<{ id: string }>;
	get(id: string): Promise<{ id: string; data: object }>;
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

export class AwsSecretManager implements SecretManagerBase {
	displayName: 'AWS Secret Manager';

	constructor() {
		const requiredEnvVariables = [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY];
		const missingEnvVariable = !requiredEnvVariables.every((key) => process.env[key] !== undefined);

		if (missingEnvVariable) {
			throw new Error(`Missing env varialbe. Set ${requiredEnvVariables.join(',')}`);
		}

		const interceptor = aws4Interceptor(
			{
				region: process.env[AWS_DEFAULT_REGION] ?? DEFAULT_REGION,
				service: SECRET_MANAGER_SERVICE,
			},
			{
				accessKeyId: process.env[AWS_ACCESS_KEY_ID] ?? '',
				secretAccessKey: process.env[AWS_SECRET_ACCESS_KEY] ?? '',
			},
		);

		client.interceptors.request.use(interceptor);
	}

	async create(name: string, value: object): Promise<{ id: string }> {
		const response = (await client({
			method: 'POST',
			url: `https://${SECRET_MANAGER_SERVICE}.${REGION}.amazonaws.com/`,
			headers: {
				'X-Amz-Target': 'secretsmanager.CreateSecret',
				'Content-Type': 'application/x-amz-json-1.1',
			},
			data: {
				Name: name,
				SecretString: JSON.stringify(value),
				ClientRequestToken: uuid(),
			},
		})) as AxiosResponse<CreateSecretResponse>;
		return { id: response.data.Name };
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
				SecretId: id,
			},
		})) as AxiosResponse<GetSecretResponse>;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, n8n-local-rules/no-uncaught-json-parse
		return { id: response.data.Name, data: JSON.parse(response.data.SecretString) };
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
				SecretId: id,
			},
		})) as AxiosResponse<DeleteSecretResponse>;
		return { id: response.data.Name };
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
				SecretId: id,
				SecretString: JSON.stringify(value),
				ClientRequestToken: uuid(),
			},
		})) as AxiosResponse<UpdateSecretResponse>;
		return { id: response.data.Name };
	}
}
