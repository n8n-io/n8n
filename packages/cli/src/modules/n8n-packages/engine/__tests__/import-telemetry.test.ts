import type { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

import type { CredentialApplyResult } from '../../entities/credential/credential.types';
import type { DataTableImportRequest } from '../../entities/data-table/data-table.types';
import type { WorkflowImportOutcome } from '../../entities/workflow/workflow-import.types';
import type { ImportContext, ImportPackageRequest } from '../../n8n-packages.types';
import type { PackageManifest } from '../../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';
import type { ImportOrchestrationResult } from '../import-orchestrator';
import { emitPackageImportedEvent, type PackageImportScope } from '../import-telemetry';

const outcome = (
	id: string,
	sourceWorkflowId: string,
	status: WorkflowImportOutcome['status'],
): WorkflowImportOutcome => ({
	status,
	sourceWorkflowId,
	workflow: mock<WorkflowEntity>({ id }),
	publishing: { state: 'unchanged' },
});

const requirement = (id: string): PackageCredentialRequirement => ({
	id,
	name: id,
	type: 'githubApi',
	usedByWorkflows: ['ignored'],
});

const scope = (input: {
	projectId: string;
	folderId?: string | null;
	outcomes: WorkflowImportOutcome[];
	credentialResult: CredentialApplyResult;
	requirements?: PackageCredentialRequirement[];
	dataTable?: { matched: number; created: number; requirements: number };
	variables?: { matched: number; missing: number; requirements: number };
}): PackageImportScope => {
	const context: ImportContext = {
		user: mock(),
		projectId: input.projectId,
		folderId: input.folderId ?? null,
	};
	const dt = input.dataTable ?? { matched: 0, created: 0, requirements: 0 };
	const vars = input.variables ?? { matched: 0, missing: 0, requirements: 0 };
	const imported: ImportOrchestrationResult = {
		workflowOutcomes: input.outcomes,
		folderSummaries: [],
		bindings: { workflows: new Map(), credentials: new Map() },
		credentialResult: input.credentialResult,
		dataTablePlan: { creations: new Array(dt.created), failures: [], matchedCount: dt.matched },
		variablePlan: {
			matched: Array.from({ length: vars.matched }, (_, i) => `matched-var-${i}`),
			missing: Array.from({ length: vars.missing }, (_, i) => ({
				name: `missing-var-${i}`,
				usedByWorkflows: [],
			})),
		},
	};
	return {
		context,
		imported,
		credentialRequest: {
			requirements: input.requirements,
			matchingMode: 'id-only',
			missingMode: 'create-stub',
			credentialBindings: undefined,
		},
		dataTableRequest: mock<DataTableImportRequest>({
			requirements: dt.requirements === 0 ? undefined : new Array(dt.requirements),
		}),
		variableRequest: {
			requirements: vars.requirements === 0 ? undefined : new Array(vars.requirements),
			missingMode: 'do-nothing',
		},
	};
};

const request = mock<ImportPackageRequest>({
	user: mock(),
	workflowConflictPolicy: 'new-version',
	workflowIdPolicy: 'new',
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'create-stub',
	workflowPublishingPolicy: 'preserve-published-state',
});

const manifest = mock<PackageManifest>({ sourceId: 'src-1', packageFormatVersion: '1' });

function lastImportedPayload(
	eventService: ReturnType<typeof mock<EventService>>,
): RelayEventMap['n8n-package-imported'] {
	expect(eventService.emit).toHaveBeenCalledTimes(1);
	const [eventName, payload] = eventService.emit.mock.calls[0];
	expect(eventName).toBe('n8n-package-imported');
	return payload as RelayEventMap['n8n-package-imported'];
}

describe('emitPackageImportedEvent', () => {
	it('aggregates counts, project ids and credential ids across every scope', () => {
		const eventService = mock<EventService>();

		emitPackageImportedEvent(eventService, {
			request,
			manifest,
			scopes: [
				scope({
					projectId: 'P1',
					folderId: 'F1',
					outcomes: [outcome('wf1', 'WF1', 'created'), outcome('wf2', 'WF2', 'skipped')],
					credentialResult: {
						bindings: new Map([['credA', 'target-a']]),
						matched: ['credA'],
						stubbed: [],
					},
					requirements: [requirement('credA')],
					dataTable: { matched: 1, created: 0, requirements: 1 },
					variables: { matched: 1, missing: 0, requirements: 1 },
				}),
				scope({
					projectId: 'P2',
					outcomes: [outcome('wf3', 'WF3', 'updated')],
					credentialResult: {
						bindings: new Map([['credB', 'stub-b']]),
						matched: [],
						stubbed: ['credB'],
					},
					requirements: [requirement('credB')],
					dataTable: { matched: 0, created: 2, requirements: 2 },
					variables: { matched: 0, missing: 2, requirements: 2 },
				}),
			],
		});

		const payload = lastImportedPayload(eventService);
		expect(payload.projectIds).toEqual(['P1', 'P2']);
		// Skipped workflows are excluded; only wf1 and wf3 were actually written.
		expect(payload.workflowIds).toEqual(['wf1', 'wf3']);
		// A multi-scope import has no single folder to attribute the event to.
		expect(payload.folderId).toBeNull();
		// Credential ids are resolved through each scope's binding map (source id -> target id).
		expect(payload.credentialIds).toEqual({
			matched: ['target-a'],
			created: ['stub-b'],
			updated: [],
		});
		expect(payload.counts).toEqual({
			workflows: { created: 1, updated: 1, skipped: 1 },
			credentials: { matched: 1, created: 1, requirements: 2 },
			dataTables: { matched: 1, created: 2, requirements: 3 },
			variables: { matched: 1, missing: 2, requirements: 3 },
		});
		expect(payload.packageSourceId).toBe('src-1');
	});

	it('preserves the folder id for a single-scope import', () => {
		const eventService = mock<EventService>();

		emitPackageImportedEvent(eventService, {
			request,
			manifest,
			scopes: [
				scope({
					projectId: 'P1',
					folderId: 'F1',
					outcomes: [outcome('wf1', 'WF1', 'created')],
					credentialResult: { bindings: new Map(), matched: [], stubbed: [] },
				}),
			],
		});

		expect(lastImportedPayload(eventService).folderId).toBe('F1');
	});
});
