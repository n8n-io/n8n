import path from 'node:path';

import { createTemplate } from '../../../../core';

export const openaiChatModelTemplate = createTemplate({
	name: 'OpenAI Compatible Chat Model Node',
	description: 'Chat model node for OpenAI-compatible providers',
	path: path.join(__dirname, 'template'),
});
