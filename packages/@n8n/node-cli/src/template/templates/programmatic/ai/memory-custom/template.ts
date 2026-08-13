import path from 'node:path';

import { createTemplate } from '../../../../core';

export const customMemoryTemplate = createTemplate({
	name: 'Custom memory node',
	description: 'Memory node with custom in-memory storage implementation',
	path: path.join(__dirname, 'template'),
});
