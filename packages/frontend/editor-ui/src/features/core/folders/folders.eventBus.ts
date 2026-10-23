import { createEventBus } from '@n8n/utils/event-bus';

export type FoldersEventMap = {
	'folder-created': {
		projectId: string;
	};
};

export const foldersEventBus = createEventBus<FoldersEventMap>();
