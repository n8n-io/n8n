import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

describe('workflow publication blocker in OpenAPI', () => {
	const specRoot = path.join(__dirname, '../spec');
	const blockerSchemaRef = '../schemas/workflowPublishBlockedError.yml';

	test('documents the blocker for publish, deprecated activate, and active workflow updates', () => {
		const publishPath = parse(
			fs.readFileSync(path.join(specRoot, 'paths/workflows.id.publish.yml'), 'utf8'),
		);
		const activatePath = parse(
			fs.readFileSync(path.join(specRoot, 'paths/workflows.id.activate.yml'), 'utf8'),
		);
		const workflowPath = parse(
			fs.readFileSync(path.join(specRoot, 'paths/workflows.id.yml'), 'utf8'),
		);

		expect(publishPath.post.responses['409'].content['application/json'].schema.$ref).toBe(
			blockerSchemaRef,
		);
		expect(activatePath.post.responses['409'].content['application/json'].schema.$ref).toBe(
			blockerSchemaRef,
		);
		expect(workflowPath.put.responses['409'].content['application/json'].schema.$ref).toBe(
			blockerSchemaRef,
		);
	});

	test('documents the review reason and request ID as optional', () => {
		const schema = parse(
			fs.readFileSync(path.join(specRoot, 'schemas/workflowPublishBlockedError.yml'), 'utf8'),
		);

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
		const schema = parse(
			fs.readFileSync(path.join(specRoot, 'schemas/workflowPublishBlockedError.yml'), 'utf8'),
		);

		expect(schema.required).toEqual(['message']);
		expect(schema.additionalProperties).toBeUndefined();
	});
});
