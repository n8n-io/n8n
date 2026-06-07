import type { AgentKnowledgeCsvService } from '../../agent-knowledge-csv.service';

import type {
	CsvAggregateInput,
	CsvDistinctInput,
	CsvProfileInput,
	CsvQueryInput,
} from './schemas';

export async function queryCsv(
	agentId: string,
	projectId: string,
	input: CsvQueryInput,
	csvService: AgentKnowledgeCsvService,
) {
	return await csvService.queryCsv(agentId, projectId, input);
}

export async function profileCsv(
	agentId: string,
	projectId: string,
	input: CsvProfileInput,
	csvService: AgentKnowledgeCsvService,
) {
	return await csvService.profileCsv(agentId, projectId, input);
}

export async function distinctCsv(
	agentId: string,
	projectId: string,
	input: CsvDistinctInput,
	csvService: AgentKnowledgeCsvService,
) {
	return await csvService.distinctCsv(agentId, projectId, input);
}

export async function aggregateCsv(
	agentId: string,
	projectId: string,
	input: CsvAggregateInput,
	csvService: AgentKnowledgeCsvService,
) {
	return await csvService.aggregateCsv(agentId, projectId, input);
}
