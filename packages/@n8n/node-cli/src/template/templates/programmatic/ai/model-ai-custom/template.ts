import path from 'node:path';

import { createTemplate } from '../../../../core';

export const customChatModelTemplate = createTemplate({
	name: 'Custom Chat Model Node',
	description: 'Chat model node with custom implementation',
	path: path.join(__dirname, 'template'),
});
