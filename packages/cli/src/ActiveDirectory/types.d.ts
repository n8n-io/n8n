export interface ActiveDirectoryConfig {
	activeDirectoryLoginEnabled: boolean;
	connection: {
		url: string;
	};
	binding: {
		baseDn: string;
		adminDn: string;
		adminPassword: string;
	};
	attributeMapping: {
		firstName: string;
		lastName: string;
		email: string;
		loginId: string;
		username: string;
	};
}
