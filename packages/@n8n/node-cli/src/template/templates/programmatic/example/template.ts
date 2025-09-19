import path from 'node:path';

import { createTemplate } from '../../../core';

export const exampleTemplate = createTemplate({
	name: 'Example',
	description: 'Barebones example node',
	path: path.join(__dirname, 'template'),
});
