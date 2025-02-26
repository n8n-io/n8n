import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	session: 'create' | 'terminate';
	window: 'create' | 'close' | 'getScreenshot' | 'load';
	extraction: 'getPaginated' | 'query' | 'scrape';
	interaction: 'click' | 'hover' | 'type';
};

export type AirtopType = AllEntities<NodeMap>;
