export interface AttributeDefinition {
	name: string;
	description: string;
	type: 'string' | 'number' | 'boolean' | 'date';
	required: boolean;
}
