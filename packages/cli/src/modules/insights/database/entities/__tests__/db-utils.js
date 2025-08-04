'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createMetadata = createMetadata;
exports.createRawInsightsEvent = createRawInsightsEvent;
exports.createRawInsightsEvents = createRawInsightsEvents;
exports.createCompactedInsightsEvent = createCompactedInsightsEvent;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const insights_by_period_repository_1 = require('../../repositories/insights-by-period.repository');
const insights_metadata_repository_1 = require('../../repositories/insights-metadata.repository');
const insights_raw_repository_1 = require('../../repositories/insights-raw.repository');
const insights_by_period_1 = require('../insights-by-period');
const insights_metadata_1 = require('../insights-metadata');
const insights_raw_1 = require('../insights-raw');
async function getWorkflowSharing(workflow) {
	return await di_1.Container.get(db_1.SharedWorkflowRepository).find({
		where: { workflowId: workflow.id },
		relations: { project: true },
	});
}
async function createMetadata(workflow) {
	const insightsMetadataRepository = di_1.Container.get(
		insights_metadata_repository_1.InsightsMetadataRepository,
	);
	const alreadyExisting = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });
	if (alreadyExisting) {
		return alreadyExisting;
	}
	const metadata = new insights_metadata_1.InsightsMetadata();
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
async function createRawInsightsEvent(workflow, parameters) {
	const insightsRawRepository = di_1.Container.get(insights_raw_repository_1.InsightsRawRepository);
	const metadata = await createMetadata(workflow);
	const event = new insights_raw_1.InsightsRaw();
	event.metaId = metadata.metaId;
	event.type = parameters.type;
	event.value = parameters.value;
	if (parameters.timestamp) {
		event.timestamp = parameters.timestamp.toUTC().toJSDate();
	}
	return await insightsRawRepository.save(event);
}
async function createRawInsightsEvents(workflow, parametersArray) {
	const insightsRawRepository = di_1.Container.get(insights_raw_repository_1.InsightsRawRepository);
	const metadata = await createMetadata(workflow);
	const events = parametersArray.map((parameters) => {
		const event = new insights_raw_1.InsightsRaw();
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
async function createCompactedInsightsEvent(workflow, parameters) {
	const insightsByPeriodRepository = di_1.Container.get(
		insights_by_period_repository_1.InsightsByPeriodRepository,
	);
	const metadata = await createMetadata(workflow);
	const event = new insights_by_period_1.InsightsByPeriod();
	event.metaId = metadata.metaId;
	event.type = parameters.type;
	event.value = parameters.value;
	event.periodUnit = parameters.periodUnit;
	event.periodStart = parameters.periodStart.toUTC().startOf(parameters.periodUnit).toJSDate();
	return await insightsByPeriodRepository.save(event);
}
//# sourceMappingURL=db-utils.js.map
