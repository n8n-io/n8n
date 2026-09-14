import type { SecretsProviderSettings } from '../../types';

type JsonString = string;

type GcpSecretsManagerCommonSettings = {
	projectId?: string;
	secretFilter?: string;
	impersonateServiceAccount?: string;
};

type GcpServiceAccountKeySettings = {
	useApplicationDefaultCredentials?: false;
	serviceAccountKey: JsonString;
};

type GcpApplicationDefaultCredentialsSettings = {
	useApplicationDefaultCredentials: true;
	serviceAccountKey?: never;
};

export type GcpSecretsManagerContext = SecretsProviderSettings<
	GcpSecretsManagerCommonSettings &
		(GcpServiceAccountKeySettings | GcpApplicationDefaultCredentialsSettings)
>;

export type RawGcpSecretAccountKey = {
	project_id?: string;
	private_key?: string;
	client_email?: string;
};

export type GcpSecretAccountKey = {
	projectId?: string;
	clientEmail: string;
	privateKey: string;
};

export type GcpSecretsManagerSettings =
	| (GcpSecretAccountKey &
			GcpSecretsManagerCommonSettings & {
				useApplicationDefaultCredentials: false;
			})
	| (GcpSecretsManagerCommonSettings & {
			useApplicationDefaultCredentials: true;
	  });
