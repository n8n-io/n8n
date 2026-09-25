import type { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

import type { CredentialApplyResult } from '../../entities/credential/credential.types';
import type { DataTableImportRequest } from '../../entities/data-table/data-table.types';
import type { PersistedWorkflowOutcome } from '../../entities/workflow/workflow-import.types';
import type {
	ImportContext,
	RemovedFolderSummary,
	RemovedWorkflowSummary,
	ResolvedImportPackageRequest,
} from '../../n8n-packages.types';
import type { PackageManifest } from '../../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';
import type { ImportContentResult } from '../import-orchestrator';
import { emitPackageImportedEvent, type PackageImportScope } from '../import-telemetry';

const outcome = (
	id: string,
	sourceWorkflowId: string,
	status: PersistedWorkflowOutcome['status'],
): PersistedWorkflowOutcome => {
	const workflow = mock<WorkflowEntity>({ id });
	return status === 'skipped'
		? { status, sourceWorkflowId, workflow }
		: { status, sourceWorkflowId, workflow, item: mock() };
};

const requirement = (id: string): PackageCredentialRequirement => ({
	id,
	name: id,
	type: 'githubApi',
	usedByWorkflows: ['ignored'],
});

const scope = (input: {
	projectId: string;
	folderId?: string | null;
	outcomes: PersistedWorkflowOutcome[];
	removedWorkflows?: RemovedWorkflowSummary[];
	removedFolders?: RemovedFolderSummary[];
	credentialResult: CredentialApplyResult;
	requirements?: PackageCredentialRequirement[];
	dataTable?: { matched: number; created: number; requirements: number };
	variables?: {
		matched: number;
		missing: number;
		requirements: number;
		createdWithValue?: number;
		stubbed?: number;
		existing?: number;
		overwritten?: number;
	};
	/** Tag ids per resolution bucket; the same id may recur across scopes. */
	tags?: {
		matched?: string[];
		created?: string[];
		renamed?: string[];
		reconciled?: string[];
		skipped?: string[];
		requirementIds?: string[];
	};
}): PackageImportScope => {
	const context: ImportContext = {
		user: mock(),
		projectId: input.projectId,
		folderId: input.folderId ?? null,
	};
	const dt = input.dataTable ?? { matched: 0, created: 0, requirements: 0 };
	const vars = input.variables ?? { matched: 0, missing: 0, requirements: 0 };
	const missingVariableNames = Array.from({ length: vars.missing }, (_, i) => `missing-var-${i}`);
	const [createdCount, stubbedCount] = [vars.createdWithValue ?? 0, vars.stubbed ?? 0];
	const createdVariableNames = missingVariableNames.slice(0, createdCount);
	const stubbedVariableNames = missingVariableNames.slice(
		createdCount,
		createdCount + stubbedCount,
	);
	const existingVariableNames = missingVariableNames.slice(
		createdCount + stubbedCount,
		createdCount + stubbedCount + (vars.existing ?? 0),
	);
	const overwrittenVariableNames = Array.from(
		{ length: vars.overwritten ?? 0 },
		(_, i) => `overwritten-var-${i}`,
	);
	const tags = input.tags ?? {};
	const toTagRefs = (ids: string[] = []) => ids.map((id) => ({ id, name: `name-of-${id}` }));
	const imported: ImportContentResult = {
		workflowOutcomes: input.outcomes,
		removedWorkflows: input.removedWorkflows ?? [],
		removedFolders: input.removedFolders ?? [],
		folderSummaries: [],
		bindings: { workflows: new Map(), credentials: new Map() },
		credentialResult: input.credentialResult,
		dataTablePlan: { creations: new Array(dt.created), failures: [], matchedCount: dt.matched },
		variablePlan: {
			matched: [
				...Array.from({ length: vars.matched }, (_, i) => `matched-var-${i}`),
				...overwrittenVariableNames,
			],
			missing: missingVariableNames.map((name) => ({ name, usedByWorkflows: [] })),
			creations: [...createdVariableNames, ...stubbedVariableNames, ...existingVariableNames].map(
				(name) => ({ name, usedByWorkflows: [] }),
			),
			conflicts: overwrittenVariableNames.map((name) => ({ name, usedByWorkflows: [] })),
			overwrites: overwrittenVariableNames.map((name) => ({
				variableId: `id-of-${name}`,
				name,
				value: 'from-package',
				usedByWorkflows: [],
			})),
		},
		variableResult: {
			created: createdVariableNames,
			stubbed: stubbedVariableNames,
			skippedExisting: existingVariableNames,
			updated: overwrittenVariableNames,
		},
		tagPlan: {
			matched: toTagRefs(tags.matched),
			creations: toTagRefs(tags.created),
			renames: (tags.renamed ?? []).map((id) => ({ id, from: 'old', to: `name-of-${id}` })),
			reconciles: (tags.reconciled ?? []).map((id) => ({
				id,
				name: `name-of-${id}`,
				oldId: `old-${id}`,
			})),
			dropped: toTagRefs(tags.skipped),
			failures: [],
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
			conflictPolicy: 'keep-existing',
		},
		tagRequest: {
			requirements: (tags.requirementIds ?? []).map((id) => ({
				id,
				name: `name-of-${id}`,
				usedByWorkflows: ['ignored'],
			})),
			missingMode: 'create',
			conflictPolicy: 'skip',
		},
	};
};

const request = mock<ResolvedImportPackageRequest>({
	user: mock(),
	workflowConflictPolicy: 'new-version',
	workflowIdPolicy: 'new',
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'create-stub',
	workflowPublishingPolicy: 'preserve-published-state',
	folderConflictPolicy: 'overwrite',
	variableMissingMode: 'create-stub',
	variableConflictPolicy: 'overwrite',
	variableParentPolicy: 'global',
	missingNodeTypeMode: 'fail',
	tagMissingMode: 'create',
	tagConflictPolicy: 'rename',
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
					tags: { matched: ['T1'], created: ['T2'], requirementIds: ['T1', 'T2'] },
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
					variables: {
						matched: 0,
						missing: 2,
						requirements: 3,
						createdWithValue: 1,
						stubbed: 1,
						overwritten: 1,
					},
					// T2 recurs from scope 1: tags are global, so it must count once.
					tags: {
						created: ['T2'],
						renamed: ['T3'],
						reconciled: ['T5'],
						skipped: ['T4'],
						requirementIds: ['T2', 'T3', 'T4', 'T5'],
					},
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
			workflows: { created: 1, updated: 1, skipped: 1, archived: 0, deleted: 0 },
			folders: { removed: 0 },
			credentials: { matched: 1, created: 1, requirements: 2 },
			dataTables: { matched: 1, created: 2, requirements: 3 },
			// scope 2's two missing requirements were created, so post-apply missing is 0; its
			// overwritten name matched first but is counted as updated, not matched.
			variables: { matched: 1, missing: 0, created: 1, stubbed: 1, updated: 1, requirements: 4 },
			// T2 and its requirement appear in both scopes but count once (unique tag ids).
			tags: { matched: 1, created: 1, renamed: 1, reconciled: 1, skipped: 1, requirements: 5 },
		});
		expect(payload.packageSourceId).toBe('src-1');
		expect(payload.options.variableMissingMode).toBe('create-stub');
		expect(payload.options.variableConflictPolicy).toBe('overwrite');
		expect(payload.options.variableParentPolicy).toBe('global');
		expect(payload.options.tagMissingMode).toBe('create');
		expect(payload.options.tagConflictPolicy).toBe('rename');
	});

	it('still counts a missing requirement the import left unfilled', () => {
		const eventService = mock<EventService>();

		emitPackageImportedEvent(eventService, {
			request,
			manifest,
			scopes: [
				scope({
					projectId: 'P1',
					outcomes: [outcome('wf1', 'WF1', 'created')],
					credentialResult: { bindings: new Map(), matched: [], stubbed: [] },
					// Of three missing requirements, one was created with a value and one already existed.
					variables: { matched: 0, missing: 3, requirements: 3, createdWithValue: 1, existing: 1 },
				}),
			],
		});

		// The one that already existed is reported as matched, like the API summary does, so all
		// three requirements are accounted for.
		expect(lastImportedPayload(eventService).counts.variables).toEqual({
			matched: 1,
			missing: 1,
			created: 1,
			stubbed: 0,
			updated: 0,
			requirements: 3,
		});
	});

	it('reconciles the names of every scope together before counting them', () => {
		const eventService = mock<EventService>();

		emitPackageImportedEvent(eventService, {
			request,
			manifest,
			scopes: [
				// Both scopes need the same name: the first creates it, so the second finds the
				// destination occupied and skips. Only one row exists, and nothing pre-existed.
				scope({
					projectId: 'P1',
					outcomes: [outcome('wf1', 'WF1', 'created')],
					credentialResult: { bindings: new Map(), matched: [], stubbed: [] },
					variables: { matched: 0, missing: 1, requirements: 1, createdWithValue: 1 },
				}),
				scope({
					projectId: 'P2',
					outcomes: [outcome('wf2', 'WF2', 'created')],
					credentialResult: { bindings: new Map(), matched: [], stubbed: [] },
					variables: { matched: 0, missing: 1, requirements: 1, existing: 1 },
				}),
			],
		});

		expect(lastImportedPayload(eventService).counts.variables).toEqual({
			matched: 0,
			missing: 0,
			created: 1,
			stubbed: 0,
			updated: 0,
			requirements: 2,
		});
	});

	it('counts reconciliation removals by what actually happened', () => {
		const eventService = mock<EventService>();
		const removed = (workflowId: string, deletion: 'archived' | 'deleted') => ({
			workflowId,
			name: workflowId,
			projectId: 'P1',
			parentFolderId: null,
			deletion,
		});

		emitPackageImportedEvent(eventService, {
			request,
			manifest,
			scopes: [
				scope({
					projectId: 'P1',
					outcomes: [outcome('wf1', 'WF1', 'created')],
					// A hard-delete whose row could not be dropped yet reports archived, and counts so.
					removedWorkflows: [removed('stale-1', 'archived'), removed('stale-2', 'deleted')],
					removedFolders: [
						{ folderId: 'F-stale', name: 'stale', projectId: 'P1', parentFolderId: null },
					],
					credentialResult: { bindings: new Map(), matched: [], stubbed: [] },
				}),
			],
		});

		const payload = lastImportedPayload(eventService);
		expect(payload.counts.workflows).toEqual({
			created: 1,
			updated: 0,
			skipped: 0,
			archived: 1,
			deleted: 1,
		});
		expect(payload.counts.folders).toEqual({ removed: 1 });
		// The settled policy is reported as-is; the dispatcher resolved it before any importer ran.
		expect(payload.options.folderConflictPolicy).toBe('overwrite');
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
