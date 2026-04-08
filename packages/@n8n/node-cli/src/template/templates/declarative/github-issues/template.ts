import path from 'node:path';

import { createTemplate } from '../../../core';

export const githubIssuesTemplate = createTemplate({
	name: 'GitHub Issues API',
	description: 'Demo node with multiple operations and credentials',
	path: path.join(__dirname, 'template'),
});
