import type { WorkflowEntity } from '@n8n/db';

import type {
	PersistedWorkflowOutcome,
	PreparedWorkflow,
} from '../../entities/workflow/workflow-import.types';
import type { ImportBindingMap } from '../../n8n-packages.types';
import type {
	PackageCredentialRequirement,
	PackageRequirementConsumer,
} from '../../spec/requirements.schema';
import {
	credentialsUpdatedAcrossScopes,
	identifyRequirements,
	reconcileCredentialSummary,
	reconcileVariableSummary,
	scopeCredentialBindingsToRequirements,
	toImportedWorkflowSummaries,
} from '../import-result';

const requirement = (
	id: string,
	usedBy: PackageRequirementConsumer[],
): PackageCredentialRequirement => ({
	id,
	name: id,
	type: 'githubApi',
	usedBy,
});

const prepared = (sourceWorkflowId: string): PreparedWorkflow =>
	({ sourceWorkflowId }) as PreparedWorkflow;

describe('identifyRequirements', () => {
	it('returns undefined when there are no requirements', () => {
		expect(identifyRequirements(undefined, [prepared('W1')])).toBeUndefined();
	});

	it('keeps only selected workflow consumers, even when an Agent has the same ID', () => {
		const requirements = [
			requirement('credA', [
				{ kind: 'workflow', id: 'W1' },
				{ kind: 'workflow', id: 'W2' },
				{ kind: 'agent', id: 'W1' },
			]),
			requirement('credB', [
				{ kind: 'workflow', id: 'W3' },
				{ kind: 'agent', id: 'W1' },
			]),
		];

		const scoped = identifyRequirements(requirements, [prepared('W1')]);

		expect(scoped).toEqual([requirement('credA', [{ kind: 'workflow', id: 'W1' }])]);
	});
});

describe('scopeCredentialBindingsToRequirements', () => {
	const bindings: ImportBindingMap = new Map([
		['credA', 'target-a'],
		['credB', 'target-b'],
	]);

	it('returns undefined when no bindings were supplied', () => {
		expect(
			scopeCredentialBindingsToRequirements(undefined, [
				requirement('credA', [{ kind: 'workflow', id: 'W1' }]),
			]),
		).toBeUndefined();
	});

	it('keeps only bindings whose source id this scope requires', () => {
		// Simulates a multi-project import where credB belongs to another project's workflows.
		const scoped = scopeCredentialBindingsToRequirements(bindings, [
			requirement('credA', [{ kind: 'workflow', id: 'W1' }]),
		]);

		expect(scoped).toEqual(new Map([['credA', 'target-a']]));
	});

	it('drops every binding when the scope has no requirements', () => {
		expect(scopeCredentialBindingsToRequirements(bindings, undefined)).toEqual(new Map());
		expect(scopeCredentialBindingsToRequirements(bindings, [])).toEqual(new Map());
	});

	it('keeps every binding when all are required by the scope', () => {
		const scoped = scopeCredentialBindingsToRequirements(bindings, [
			requirement('credA', [{ kind: 'workflow', id: 'W1' }]),
			requirement('credB', [{ kind: 'workflow', id: 'W2' }]),
		]);

		expect(scoped).toEqual(bindings);
	});
});

describe('reconcileVariableSummary', () => {
	// The only case the import integration suites cannot reach: a destination occupied by an
	// external writer between plan and apply, which no scope of this import created.
	it('counts a skip that no scope stubbed as matched', () => {
		expect(
			reconcileVariableSummary({
				matched: [],
				missing: ['API_URL'],
				created: [],
				stubbed: [],
				skipped: ['API_URL'],
				updated: [],
			}),
		).toEqual({ matched: ['API_URL'], missing: [], created: [], stubbed: [], updated: [] });
	});
});

describe('reconcileCredentialSummary', () => {
	it('lists an updated source id under updated only', () => {
		expect(
			reconcileCredentialSummary({
				matched: ['cred-1', 'cred-2'],
				stubbed: [],
				seeded: [],
				incomplete: [],
				updated: ['cred-1'],
			}),
		).toEqual({
			matched: ['cred-2'],
			stubbed: [],
			seeded: [],
			incomplete: [],
			updated: ['cred-1'],
		});
	});

	it('unions the outcomes of every scope', () => {
		// One credential, two scopes: the first scope wrote it, the second found it written.
		expect(
			reconcileCredentialSummary({
				matched: ['cred-1', 'cred-1', 'cred-2', 'cred-2'],
				stubbed: ['cred-3', 'cred-3'],
				seeded: ['cred-4', 'cred-4'],
				incomplete: ['cred-5', 'cred-5'],
				updated: ['cred-1'],
			}),
		).toEqual({
			matched: ['cred-2'],
			stubbed: ['cred-3'],
			seeded: ['cred-4'],
			incomplete: ['cred-5'],
			updated: ['cred-1'],
		});
	});
});

describe('credentialsUpdatedAcrossScopes', () => {
	const scope = (
		bindings: Array<[string, string]>,
		outcome: { matched?: string[]; updated?: string[] },
	) => ({
		bindings: new Map(bindings),
		matched: outcome.matched ?? [],
		updated: outcome.updated ?? [],
	});

	it('lists a source id that a later scope matched to a credential an earlier scope wrote', () => {
		expect(
			credentialsUpdatedAcrossScopes([
				scope([['source-a', 'target-1']], { updated: ['source-a'] }),
				scope([['source-b', 'target-1']], { matched: ['source-b'] }),
			]),
		).toEqual(['source-a', 'source-b']);
	});

	it('lists a source id that an earlier scope matched to a credential a later scope wrote', () => {
		expect(
			credentialsUpdatedAcrossScopes([
				scope([['source-a', 'target-1']], { matched: ['source-a'] }),
				scope([['source-b', 'target-1']], { updated: ['source-b'] }),
			]),
		).toEqual(['source-a', 'source-b']);
	});

	it('leaves out a matched source id whose credential no scope wrote', () => {
		expect(
			credentialsUpdatedAcrossScopes([
				scope(
					[
						['source-a', 'target-1'],
						['source-c', 'target-2'],
					],
					{ matched: ['source-c'], updated: ['source-a'] },
				),
			]),
		).toEqual(['source-a']);
	});
});

describe('toImportedWorkflowSummaries', () => {
	const workflow = (parentFolderId: string | null) =>
		({
			id: 'w1',
			name: 'W1',
			activeVersionId: null,
			isArchived: false,
			parentFolder: parentFolderId === null ? null : { id: parentFolderId },
		}) as unknown as WorkflowEntity;
	const updated = (moveToFolderId?: string | null): PersistedWorkflowOutcome =>
		({
			status: 'updated',
			workflow: workflow('old'),
			sourceWorkflowId: 'w1',
			item: { action: 'update', moveToFolderId },
		}) as unknown as PersistedWorkflowOutcome;

	it('reports the folder a planned move puts the workflow in, and marks it moved', () => {
		const [summary] = toImportedWorkflowSummaries([updated('F')], 'p1', new Map());

		expect(summary).toMatchObject({ parentFolderId: 'F', status: 'updated', moved: true });
	});

	it('reports the project root for a move to the root', () => {
		const [summary] = toImportedWorkflowSummaries([updated(null)], 'p1', new Map());

		expect(summary).toMatchObject({ parentFolderId: null, moved: true });
	});

	it('keeps the current folder and no moved flag without a move', () => {
		const [summary] = toImportedWorkflowSummaries([updated()], 'p1', new Map());

		expect(summary.parentFolderId).toBe('old');
		expect(summary).not.toHaveProperty('moved');
	});
});
