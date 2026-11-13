import path from 'node:path';

import { createTemplate } from '../../../core';

export const webhookTriggerTemplate = createTemplate({
	name: 'Webhook trigger (preview)',
	description: 'Trigger that registers a webhook and receives events',
	path: path.join(__dirname, 'template'),
});
