import type { ImportBlockingIssue } from '@n8n/api-types';

import type { BlockingIssue } from '../n8n-packages.types';

// `ImportBlockingIssue` is a zod mirror of this `BlockingIssue` union, kept separate because `@n8n/api-types`
// cannot depend on `packages/cli`. This is the one-way check that keeps them from drifting: it fails to typecheck
// the moment `BlockingIssue` gains, loses, or reshapes a variant that `importBlockingIssueSchema` does not mirror.
describe('BlockingIssue / ImportBlockingIssue contract', () => {
	it('mirrors the schema inferred from importBlockingIssueSchema exactly', () => {
		expectTypeOf<BlockingIssue>().toExtend<ImportBlockingIssue>();
		expectTypeOf<ImportBlockingIssue>().toExtend<BlockingIssue>();
	});
});
