import type { AgentKnowledgeSandboxCsvService } from '../../agent-knowledge-sandbox-csv.service';
import type { KnowledgeSandboxWorkspace } from '../../agent-knowledge-sandbox-workspace.service';

import type { WorkspaceFiles } from './file-references';
import type {
	CsvAggregateInput,
	CsvDistinctInput,
	CsvProfileInput,
	CsvQueryInput,
} from './schemas';

export async function queryCsv(
	workspace: KnowledgeSandboxWorkspace,
	files: WorkspaceFiles,
	input: CsvQueryInput,
	csvService: AgentKnowledgeSandboxCsvService,
) {
	return await csvService.queryCsv(workspace, files, input);
}

export async function profileCsv(
	workspace: KnowledgeSandboxWorkspace,
	files: WorkspaceFiles,
	input: CsvProfileInput,
	csvService: AgentKnowledgeSandboxCsvService,
) {
	return await csvService.profileCsv(workspace, files, input);
}

export async function distinctCsv(
	workspace: KnowledgeSandboxWorkspace,
	files: WorkspaceFiles,
	input: CsvDistinctInput,
	csvService: AgentKnowledgeSandboxCsvService,
) {
	return await csvService.distinctCsv(workspace, files, input);
}

export async function aggregateCsv(
	workspace: KnowledgeSandboxWorkspace,
	files: WorkspaceFiles,
	input: CsvAggregateInput,
	csvService: AgentKnowledgeSandboxCsvService,
) {
	return await csvService.aggregateCsv(workspace, files, input);
}
