import type { PreparedWorkflow } from '../../entities/workflow/workflow-import.types';
import type { ImportBindingMap } from '../../n8n-packages.types';
import type {
	PackageCredentialRequirement,
	PackageRequirementConsumer,
} from '../../spec/requirements.schema';
import {
	identifyRequirements,
	reconcileVariableSummary,
	scopeCredentialBindingsToRequirements,
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
