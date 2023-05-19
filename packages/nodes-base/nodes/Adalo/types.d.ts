export type AdaloCredentials = {
	apiKey: string;
	appId: string;
};

export type FieldsUiValues = Array<{
	fieldId: string;
	fieldValue: string;
}>;

export type Operation = 'create' | 'delete' | 'update' | 'get' | 'getAll';
