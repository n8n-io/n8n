type QuickConnectGenericOption = {
	packageName: string;
	credentialType: string;
	text: string;
	quickConnectType: string;
	consentText?: string;
	consentCheckbox?: string;
	config?: never;
};

export type QuickConnectPineconeOption = Omit<QuickConnectGenericOption, 'config'> & {
	quickConnectType: 'pinecone';
	config: {
		integrationId: string;
	};
};

export type QuickConnectOption = QuickConnectGenericOption | QuickConnectPineconeOption;
