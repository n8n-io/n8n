import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

describe('workflow publication blocker in OpenAPI', () => {
	const specRoot = path.join(__dirname, '../spec');

	const readSpec = (relativePath: string) =>
		parse(fs.readFileSync(path.join(specRoot, relativePath), 'utf8'));

	// These generate their 409 from `WorkflowPublishBlockedErrorPublicDto`, so the body is inline
	// rather than a $ref to a hand-written schema.
	test.each(['publishWorkflow', 'activateWorkflow', 'updateWorkflow'])(
		'documents the blocker for the generated %s route',
		(route) => {
			const { schema } = readSpec(`paths/${route}.generated.yml`).responses['409'].content[
				'application/json'
			];

			expect(schema.required).toEqual(['message']);
			expect(schema.properties.reason.enum).toEqual(['review_pending', 'changes_requested']);
			expect(schema.properties.workflowReviewRequestId.type).toBe('string');
		},
	);

	// The update route replaces the shared 403 with its own body, because a refused
	// re-publication still saved a draft the caller needs to be told about.
	test('documents the permission refusal separately, naming the saved draft', () => {
		const { schema } = readSpec('paths/updateWorkflow.generated.yml').responses['403'].content[
			'application/json'
		];

		expect(schema.required).toEqual(['message']);
		expect(schema.properties.reason.enum).toEqual([
			'insufficient_api_key_scope',
			'insufficient_permissions',
		]);
		expect(schema.properties.versionId.type).toBe('string');
	});
});
