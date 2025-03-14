import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { DateTime } from 'luxon';

import { InsightsByPeriod } from '@/databases/entities/insights-by-period';
import { InsightsMetadata } from '@/databases/entities/insights-metadata';
import { InsightsRaw } from '@/databases/entities/insights-raw';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { InsightsByPeriodRepository } from '@/databases/repositories/insights-by-period.repository';
import { InsightsMetadataRepository } from '@/databases/repositories/insights-metadata.repository';
import { InsightsRawRepository } from '@/databases/repositories/insights-raw.repository';

import { getWorkflowSharing } from './workflows';

export const { type: dbType } = Container.get(GlobalConfig).database;

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
		if (dbType === 'sqlite') {
			event.timestamp = parameters.timestamp.toUTC().toSeconds() as any;
		} else {
			event.timestamp = parameters.timestamp.toUTC().toJSDate();
		}
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
	if (dbType === 'sqlite') {
		event.periodStart = parameters.periodStart
			.toUTC()
			.startOf(parameters.periodUnit)
			.toSeconds() as any;
	} else {
		event.periodStart = parameters.periodStart.toUTC().startOf(parameters.periodUnit).toJSDate();
	}

	return await insightsByPeriodRepository.save(event);
}
