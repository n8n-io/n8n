import path from 'node:path';

import { createTemplate } from '../../../core';

export const pollingTriggerTemplate = createTemplate({
	name: 'Polling trigger (preview)',
	description: 'Trigger that checks an API for new items on a schedule',
	path: path.join(__dirname, 'template'),
});
