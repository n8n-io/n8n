import path from 'node:path';

import { createTemplate } from '../../../../core';

export const customChatModelExampleTemplate = createTemplate({
	name: 'OpenAI chat model node',
	description: 'Chat model node with custom implementation',
	path: path.join(__dirname, 'template'),
});
