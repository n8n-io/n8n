export type QuickConnectDisclaimer = {
	text: string;
	linkUrl: string;
	linkLabel?: string;
};

type QuickConnectGenericOption = {
	packageName: string;
	credentialType: string;
	text: string;
	quickConnectType: string;
	consentText?: string;
	consentCheckbox?: string;
	disclaimer?: QuickConnectDisclaimer;
	config?: never;
};

export type QuickConnectPineconeOption = Omit<QuickConnectGenericOption, 'config'> & {
	quickConnectType: 'pinecone';
	config: {
		integrationId: string;
	};
};

export type QuickConnectOption = QuickConnectGenericOption | QuickConnectPineconeOption;
