import type { WorkflowPublishHistory } from '@n8n/rest-api-client/api/workflowHistory';

export const getLastPublishedByUser = (workflowPublishHistory: WorkflowPublishHistory[]) => {
	return workflowPublishHistory.findLast(
		(history) => history.mode === 'activate' && history.userId !== null,
	);
};

const generateRandomSuffix = (length: number) => {
	const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';

	for (let i = 0; i < length; i++) {
		const index = Math.floor(Math.random() * characters.length);
		result += characters[index] ?? '';
	}

	return result;
};

export const generateVersionName = () => {
	return `Version ${generateRandomSuffix(6)}`;
};
