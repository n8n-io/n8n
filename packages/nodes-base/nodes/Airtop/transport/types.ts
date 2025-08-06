import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

export interface IAirtopSessionResponse extends IDataObject {
	data: {
		id: string;
		status: string;
	};
}

export interface IAirtopResponse extends IDataObject {
	sessionId?: string;
	windowId?: string;
	data?: IDataObject & {
		windowId?: string;
		modelResponse?: string;
		files?: IDataObject[];
	};
	meta?: IDataObject & {
		status?: string;
		screenshots?: Array<{ dataUrl: string }>;
	};
	errors?: IDataObject[];
	warnings?: IDataObject[];
	output?: IDataObject;
}

export interface IAirtopResponseWithFiles extends IAirtopResponse {
	data: {
		files: IDataObject[];
		fileName?: string;
		status?: string;
		downloadUrl?: string;
		pagination: {
			hasMore: boolean;
		};
		sessionIds?: string[];
	};
}

export interface IAirtopInteractionRequest extends IDataObject {
	text?: string;
	waitForNavigation?: boolean;
	elementDescription?: string;
	pressEnterKey?: boolean;
	// scroll parameters
	scrollToElement?: string;
	scrollWithin?: string;
	scrollToEdge?: {
		xAxis?: string;
		yAxis?: string;
	};
	scrollBy?: {
		xAxis?: string;
		yAxis?: string;
	};
	// configuration
	configuration: {
		visualAnalysis?: {
			scope: string;
		};
		waitForNavigationConfig?: {
			waitUntil: string;
		};
	};
}

export interface IAirtopFileInputRequest extends IDataObject {
	fileId: string;
	windowId: string;
	sessionId: string;
	elementDescription?: string;
	includeHiddenElements?: boolean;
}

export interface IAirtopNodeExecutionData extends INodeExecutionData {
	json: IAirtopResponse;
}

export interface IAirtopServerEvent {
	event: string;
	eventData: {
		error?: string;
	};
	fileId?: string;
	status?: string;
	downloadUrl?: string;
}
