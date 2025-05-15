import { EntityRegistry } from '@n8n/db';
import { Container } from '@n8n/di';

import { InsightsByPeriod } from './database/entities/insights-by-period';
import { InsightsMetadata } from './database/entities/insights-metadata';
import { InsightsRaw } from './database/entities/insights-raw';
import type { ModulePreInitContext } from '../modules.config';

export const shouldLoadModule = (ctx: ModulePreInitContext) => {
	// Only main instance(s) should collect insights
	// Because main instances are informed of all finished workflow executions, whatever the mode
	const shouldLoad = ctx.instance.instanceType === 'main';
	if (shouldLoad) {
		Container.get(EntityRegistry).registerEntities(InsightsByPeriod, InsightsMetadata, InsightsRaw);
	}
	return shouldLoad;
};
