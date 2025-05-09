import type { WorkflowEntity } from '@n8n/db';
import { SharedWorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DateTime } from 'luxon';
import type { IWorkflowBase } from 'n8n-workflow';

import { InsightsByPeriodRepository } from '../../repositories/insights-by-period.repository';
import { InsightsMetadataRepository } from '../../repositories/insights-metadata.repository';
import { InsightsRawRepository } from '../../repositories/insights-raw.repository';
import { InsightsByPeriod } from '../insights-by-period';
import { InsightsMetadata } from '../insights-metadata';
import { InsightsRaw } from '../insights-raw';

async function getWorkflowSharing(workflow: IWorkflowBase) {
	return await Container.get(SharedWorkflowRepository).find({
		where: { workflowId: workflow.id },
		relations: { project: true },
	});
}

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

export async function createRawInsightsEvents(
	workflow: WorkflowEntity,
	parametersArray: Array<{
		type: InsightsRaw['type'];
		value: number;
		timestamp?: DateTime;
	}>,
) {
	const insightsRawRepository = Container.get(InsightsRawRepository);
	const metadata = await createMetadata(workflow);

	const events = parametersArray.map((parameters) => {
		const event = new InsightsRaw();
		event.metaId = metadata.metaId;
		event.type = parameters.type;
		event.value = parameters.value;
		if (parameters.timestamp) {
			event.timestamp = parameters.timestamp.toUTC().toJSDate();
		}
		return event;
	});
	await insightsRawRepository.save(events);
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
