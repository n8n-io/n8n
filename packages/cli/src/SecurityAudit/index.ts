import { reportSqlInjection } from './sqlInjectionRisk.report';
import { reportInactiveCreds } from './inactiveCreds.report';
import { reportOpenWebhooks } from './openWebhooks.report';
import { reportSensitiveNodes } from './sensitiveNodes.report';
import { reportOutdatedInstance } from './outdatedInstance.report';

export {
	reportSqlInjection,
	reportInactiveCreds,
	reportOpenWebhooks,
	reportSensitiveNodes,
	reportOutdatedInstance,
};
