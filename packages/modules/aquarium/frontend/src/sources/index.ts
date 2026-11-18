import type { EntitySource, MetricsSource } from '../aquarium.types';
import { agentsSource } from './agents.source';
import { demoSource } from './demo.source';
import { executionsSource } from './executions.source';
import { insightsSource } from './insights.source';
import { workflowsSource } from './workflows.source';

export const liveEntitySources: EntitySource[] = [workflowsSource, agentsSource];

/** Insights is more accurate than the execution sample, so it comes last and wins. */
export const liveMetricsSources: MetricsSource[] = [executionsSource, insightsSource];

export const demoEntitySources: EntitySource[] = [demoSource];
