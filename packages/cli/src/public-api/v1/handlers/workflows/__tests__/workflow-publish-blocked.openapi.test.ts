import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

describe('workflow publication blocker in OpenAPI', () => {
	const specRoot = path.join(__dirname, '../spec');
	const blockerSchemaRef = '../schemas/workflowPublishBlockedError.yml';

	const readSpec = (relativePath: string) =>
		parse(fs.readFileSync(path.join(specRoot, relativePath), 'utf8'));

	test('documents the blocker for active workflow updates', () => {
		const workflowPath = readSpec('paths/workflows.id.yml');

		expect(workflowPath.put.responses['409'].content['application/json'].schema.$ref).toBe(
			blockerSchemaRef,
		);
	});

	// These generate their 409 from `WorkflowPublishBlockedErrorPublicDto`, so the body is inline
	// rather than a $ref to the hand-written schema the route above still uses.
	test.each(['publishWorkflow', 'activateWorkflow'])(
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

	test('documents the review reason and request ID as optional', () => {
		const schema = readSpec('schemas/workflowPublishBlockedError.yml');

		expect(schema).toMatchObject({
			properties: {
				reason: {
					enum: ['review_pending', 'changes_requested'],
				},
				workflowReviewRequestId: {
					type: 'string',
				},
			},
		});
	});

	// the same 409 also carries webhook conflicts, whose body is
	// `message`-only
	test('stays satisfiable by a message-only conflict body', () => {
		const schema = readSpec('schemas/workflowPublishBlockedError.yml');

		expect(schema.required).toEqual(['message']);
		expect(schema.additionalProperties).toBeUndefined();
	});
});
