import type { EntitySource, MetricsSource } from '../aquarium.types';
import { agentsSource } from './agents.source';
import { demoSource } from './demo.source';
import { executionsSource } from './executions.source';
import { insightsSource } from './insights.source';
import { securitySource } from './security.source';
import { workflowsSource } from './workflows.source';

export const liveEntitySources: EntitySource[] = [workflowsSource, agentsSource];

/** Insights is more accurate than the execution sample, so it comes last and wins. */
export const liveRunStatsSources: MetricsSource[] = [executionsSource, insightsSource];

/** Security sets a field that no other source sets, so its place does not matter. */
export const liveMetricsSources: MetricsSource[] = [securitySource, ...liveRunStatsSources];

export const demoEntitySources: EntitySource[] = [demoSource];
