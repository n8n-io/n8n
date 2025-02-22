import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	session: 'create' | 'terminate';
	window: 'create' | 'close' | 'getScreenshot' | 'load' | 'query';
	extraction: 'getPaginated';
	interaction: 'click' | 'hover' | 'type';
};

export type AirtopType = AllEntities<NodeMap>;
