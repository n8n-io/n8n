import type { ImportBlockingIssue } from '@n8n/api-types';

import type { BlockingIssue } from '../n8n-packages.types';

// ImportBlockingIssue is a zod mirror of this BlockingIssue union, kept separate because
// @n8n/api-types cannot depend on `packages/cli` (the dependency runs the other way). This
// check keeps them from drifting.
describe('BlockingIssue / ImportBlockingIssue contract', () => {
	it('mirrors the schema inferred from importBlockingIssueSchema exactly, variant by variant', () => {
		expectTypeOf<Extract<BlockingIssue, { type: 'workflow-conflict' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'workflow-conflict' }>
		>();
		expectTypeOf<
			Extract<BlockingIssue, { type: 'workflow-lineage-conflict' }>
		>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'workflow-lineage-conflict' }>
		>();
		expectTypeOf<Extract<BlockingIssue, { type: 'workflow-id-conflict' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'workflow-id-conflict' }>
		>();
		expectTypeOf<
			Extract<BlockingIssue, { type: 'workflow-folder-conflict' }>
		>().branded.toEqualTypeOf<Extract<ImportBlockingIssue, { type: 'workflow-folder-conflict' }>>();
		expectTypeOf<
			Extract<BlockingIssue, { type: 'workflow-archive-forbidden' }>
		>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'workflow-archive-forbidden' }>
		>();
		expectTypeOf<Extract<BlockingIssue, { type: 'credential-unresolved' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'credential-unresolved' }>
		>();
		expectTypeOf<Extract<BlockingIssue, { type: 'project-conflict' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'project-conflict' }>
		>();
		expectTypeOf<Extract<BlockingIssue, { type: 'folder-conflict' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'folder-conflict' }>
		>();
		expectTypeOf<
			Extract<BlockingIssue, { type: 'workflow-removal-forbidden' }>
		>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'workflow-removal-forbidden' }>
		>();
		expectTypeOf<
			Extract<BlockingIssue, { type: 'workflow-removal-conflict' }>
		>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'workflow-removal-conflict' }>
		>();
		expectTypeOf<
			Extract<BlockingIssue, { type: 'folder-removal-forbidden' }>
		>().branded.toEqualTypeOf<Extract<ImportBlockingIssue, { type: 'folder-removal-forbidden' }>>();
		expectTypeOf<Extract<BlockingIssue, { type: 'data-table-unresolved' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'data-table-unresolved' }>
		>();
		expectTypeOf<Extract<BlockingIssue, { type: 'tag-unresolved' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'tag-unresolved' }>
		>();
		expectTypeOf<Extract<BlockingIssue, { type: 'variable-unresolved' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'variable-unresolved' }>
		>();
		expectTypeOf<Extract<BlockingIssue, { type: 'variable-conflict' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'variable-conflict' }>
		>();
		expectTypeOf<
			Extract<BlockingIssue, { type: 'variable-limit-exceeded' }>
		>().branded.toEqualTypeOf<Extract<ImportBlockingIssue, { type: 'variable-limit-exceeded' }>>();
		expectTypeOf<Extract<BlockingIssue, { type: 'missing-node-type' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'missing-node-type' }>
		>();
		expectTypeOf<Extract<BlockingIssue, { type: 'policy-violation' }>>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'policy-violation' }>
		>();
		expectTypeOf<
			Extract<BlockingIssue, { type: 'credential-policy-violation' }>
		>().branded.toEqualTypeOf<
			Extract<ImportBlockingIssue, { type: 'credential-policy-violation' }>
		>();
	});

	it('covers the same set of variants on both sides (nothing added or removed)', () => {
		expectTypeOf<BlockingIssue['type']>().branded.toEqualTypeOf<ImportBlockingIssue['type']>();
	});
});
