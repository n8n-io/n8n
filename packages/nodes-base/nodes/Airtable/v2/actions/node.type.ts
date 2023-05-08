import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	record: 'create' | 'upsert' | 'deleteRecord' | 'get' | 'search' | 'update';
	base: 'create';
	table: 'create';
};

export type AirtableType = AllEntities<NodeMap>;
