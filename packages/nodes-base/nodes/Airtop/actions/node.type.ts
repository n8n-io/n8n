import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	session: 'create' | 'save' | 'terminate';
	window: 'create' | 'close' | 'takeScreenshot' | 'load';
	extraction: 'getPaginated' | 'query' | 'scrape';
	interaction: 'click' | 'hover' | 'type';
};

export type AirtopType = AllEntities<NodeMap>;
