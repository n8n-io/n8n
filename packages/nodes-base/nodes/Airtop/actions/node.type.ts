import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	session: 'create' | 'terminate';
	window: 'create' | 'close' | 'getScreenshot' | 'query';
	extraction: 'getPaginated';
};

export type AirtopType = AllEntities<NodeMap>;
