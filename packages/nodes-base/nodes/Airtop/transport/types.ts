import type { IDataObject } from 'n8n-workflow';

export interface IAirtopResponse extends IDataObject {
	sessionId?: string;
	data: IDataObject;
	meta: IDataObject;
	errors: IDataObject[];
	warnings: IDataObject[];
}

export interface IAirtopInteractionRequest extends IDataObject {
	text?: string;
	waitForNavigation?: boolean;
	elementDescription?: string;
	pressEnterKey?: boolean;
	configuration: {
		visualAnalysis?: {
			scope: string;
		};
		waitForNavigationConfig?: {
			waitUntil: string;
		};
	};
}
