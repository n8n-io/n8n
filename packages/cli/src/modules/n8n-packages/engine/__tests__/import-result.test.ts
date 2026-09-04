import type { PreparedWorkflow } from '../../entities/workflow/workflow-import.types';
import type { ImportBindingMap } from '../../n8n-packages.types';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';
import {
	identifyRequirements,
	reconcileVariableSummary,
	scopeCredentialBindingsToRequirements,
} from '../import-result';

const requirement = (id: string, usedByWorkflows: string[]): PackageCredentialRequirement => ({
	id,
	name: id,
	type: 'githubApi',
	usedByWorkflows,
});

const prepared = (sourceWorkflowId: string): PreparedWorkflow =>
	({ sourceWorkflowId }) as PreparedWorkflow;

describe('identifyRequirements', () => {
	it('returns undefined when there are no requirements', () => {
		expect(identifyRequirements(undefined, [prepared('W1')])).toBeUndefined();
	});

	it('keeps only in-scope workflows and drops requirements that no in-scope workflow uses', () => {
		const requirements = [requirement('credA', ['W1', 'W2']), requirement('credB', ['W3'])];

		const scoped = identifyRequirements(requirements, [prepared('W1')]);

		// credA stays (W1 is in scope) but with W2 trimmed off; credB drops entirely (W3 is out of scope).
		expect(scoped).toEqual([requirement('credA', ['W1'])]);
	});
});

describe('scopeCredentialBindingsToRequirements', () => {
	const bindings: ImportBindingMap = new Map([
		['credA', 'target-a'],
		['credB', 'target-b'],
	]);

	it('returns undefined when no bindings were supplied', () => {
		expect(
			scopeCredentialBindingsToRequirements(undefined, [requirement('credA', ['W1'])]),
		).toBeUndefined();
	});

	it('keeps only bindings whose source id this scope requires', () => {
		// Simulates a multi-project import where credB belongs to another project's workflows.
		const scoped = scopeCredentialBindingsToRequirements(bindings, [requirement('credA', ['W1'])]);

		expect(scoped).toEqual(new Map([['credA', 'target-a']]));
	});

	it('drops every binding when the scope has no requirements', () => {
		expect(scopeCredentialBindingsToRequirements(bindings, undefined)).toEqual(new Map());
		expect(scopeCredentialBindingsToRequirements(bindings, [])).toEqual(new Map());
	});

	it('keeps every binding when all are required by the scope', () => {
		const scoped = scopeCredentialBindingsToRequirements(bindings, [
			requirement('credA', ['W1']),
			requirement('credB', ['W2']),
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
