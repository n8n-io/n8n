import type { SecretsProviderSettings } from '@/Interfaces';

export type GcpSecretsManagerContext = SecretsProviderSettings<{
	serviceAccountKey: string;
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
