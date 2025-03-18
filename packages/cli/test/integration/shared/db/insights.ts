import { Container } from '@n8n/di';
import type { DateTime } from 'luxon';

import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { InsightsByPeriodRepository } from '@/databases/repositories/insights-by-period.repository';
import { InsightsMetadataRepository } from '@/databases/repositories/insights-metadata.repository';
import { InsightsRawRepository } from '@/databases/repositories/insights-raw.repository';
import { InsightsByPeriod } from '@/modules/insights/entities/insights-by-period';
import { InsightsMetadata } from '@/modules/insights/entities/insights-metadata';
import { InsightsRaw } from '@/modules/insights/entities/insights-raw';

import { getWorkflowSharing } from './workflows';

export async function createMetadata(workflow: WorkflowEntity) {
	const insightsMetadataRepository = Container.get(InsightsMetadataRepository);
	const alreadyExisting = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });

	if (alreadyExisting) {
		return alreadyExisting;
	}

	const metadata = new InsightsMetadata();
	metadata.workflowName = workflow.name;
	metadata.workflowId = workflow.id;

	const workflowSharing = (await getWorkflowSharing(workflow)).find(
		(wfs) => wfs.role === 'workflow:owner',
	);
	if (workflowSharing) {
		metadata.projectName = workflowSharing.project.name;
		metadata.projectId = workflowSharing.project.id;
	}

	await insightsMetadataRepository.save(metadata);

	return metadata;
}

export async function createRawInsightsEvent(
	workflow: WorkflowEntity,
	parameters: {
		type: InsightsRaw['type'];
		value: number;
		timestamp?: DateTime;
	},
) {
	const insightsRawRepository = Container.get(InsightsRawRepository);
	const metadata = await createMetadata(workflow);

	const event = new InsightsRaw();
	event.metaId = metadata.metaId;
	event.type = parameters.type;
	event.value = parameters.value;
	if (parameters.timestamp) {
		event.timestamp = parameters.timestamp.toUTC().toJSDate();
	}
	return await insightsRawRepository.save(event);
}

export async function createCompactedInsightsEvent(
	workflow: WorkflowEntity,
	parameters: {
		type: InsightsByPeriod['type'];
		value: number;
		periodUnit: InsightsByPeriod['periodUnit'];
		periodStart: DateTime;
	},
) {
	const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
	const metadata = await createMetadata(workflow);

	const event = new InsightsByPeriod();
	event.metaId = metadata.metaId;
	event.type = parameters.type;
	event.value = parameters.value;
	event.periodUnit = parameters.periodUnit;
	event.periodStart = parameters.periodStart.toUTC().startOf(parameters.periodUnit).toJSDate();

	return await insightsByPeriodRepository.save(event);
}
