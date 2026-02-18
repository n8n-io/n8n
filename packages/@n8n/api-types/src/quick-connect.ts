type QuickConnectGenericOption = {
	packageName: string;
	credentialType: string;
	text: string;
	quickConnectType: string;
	serviceName: string;
	consentText?: string;
	config?: never;
};

export type QuickConnectPineconeOption = Omit<QuickConnectGenericOption, 'config'> & {
	quickConnectType: 'pinecone';
	config: {
		integrationId: string;
	};
};

export type QuickConnectOption = QuickConnectGenericOption | QuickConnectPineconeOption;
