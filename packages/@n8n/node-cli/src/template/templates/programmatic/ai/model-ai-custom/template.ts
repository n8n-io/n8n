import path from 'node:path';

import { createTemplate } from '../../../../core';

export const customChatModelTemplate = createTemplate({
	name: 'Custom chat model node',
	description: 'Chat model node with custom implementation',
	path: path.join(__dirname, 'template'),
});
