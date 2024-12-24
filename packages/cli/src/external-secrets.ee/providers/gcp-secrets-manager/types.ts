import type { SecretsProviderSettings } from '@/interfaces';

type JsonString = string;

export type GcpSecretsManagerContext = SecretsProviderSettings<{
	serviceAccountKey: JsonString;
}>;

export type RawGcpSecretAccountKey = {
	project_id?: string;
	private_key?: string;
	client_email?: string;
};

export type GcpSecretAccountKey = {
	projectId: string;
	clientEmail: string;
	privateKey: string;
};
