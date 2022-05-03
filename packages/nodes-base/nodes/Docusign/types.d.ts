export type DSMetadataObject = {
	sub: string;
	name: string;
	given_name: string;
	family_name: string;
	created: string;
	email: string;
	accounts: DSAccount[];
};

export type DSAccount = {
	account_id: string;
	is_default: boolean;
	account_name: string;
	base_uri: string;
};
