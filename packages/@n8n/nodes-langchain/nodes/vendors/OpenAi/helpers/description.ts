import type { INodeInputConfiguration } from 'n8n-workflow';

export const prettifyOperation = (resource: string, operation: string) => {
	if (operation === 'deleteAssistant') {
		return 'Delete Assistant';
	}

	if (operation === 'deleteFile') {
		return 'Delete File';
	}

	if (operation === 'classify') {
		return 'Classify Text';
	}

	if (operation === 'message' && resource === 'text') {
		return 'Message Model';
	}

	const capitalize = (str: string) => {
		const chars = str.split('');
		chars[0] = chars[0].toUpperCase();
		return chars.join('');
	};

	if (['transcribe', 'translate'].includes(operation)) {
		resource = 'recording';
	}

	if (operation === 'list') {
		resource = resource + 's';
	}

	return `${capitalize(operation)} ${capitalize(resource)}`;
};

export const configureNodeInputs = (
	resource: string,
	operation: string,
	hideTools: string,
	memory: string | undefined,
) => {
	if (resource === 'assistant' && operation === 'message') {
		const inputs: INodeInputConfiguration[] = [
			{ type: 'main' },
			{ type: 'ai_tool', displayName: 'Tools' },
		];
		if (memory !== 'threadId') {
			inputs.push({ type: 'ai_memory', displayName: 'Memory', maxConnections: 1 });
		}
		return inputs;
	}
	if (resource === 'text' && (operation === 'message' || operation === 'response')) {
		if (hideTools === 'hide') {
			return ['main'];
		}
		return [{ type: 'main' }, { type: 'ai_tool', displayName: 'Tools' }];
	}

	return ['main'];
};
