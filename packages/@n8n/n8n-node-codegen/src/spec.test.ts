import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readSpecOperations } from './spec';

const ROOT = 'openapi.decorator-routes.generated.yml';

function writeSpec(files: Record<string, string>) {
	const dir = mkdtempSync(path.join(tmpdir(), 'n8n-node-codegen-'));
	for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), content);
	return dir;
}

const root = (paths: string) =>
	`openapi: 3.0.0\ninfo:\n  title: test\n  version: 0.0.0\npaths:\n${paths}`;

const tagsOperation = `operationId: getTags
tags:
  - Tags
summary: Retrieve all tags
x-required-scope: tag:list
parameters:
  - $ref: ./limit.yml
  - name: cursor
    in: query
    schema:
      type: string
  - name: withUsage
    in: query
    schema:
      type: string
      enum: ['true', 'false']
responses:
  '200':
    description: OK
    content:
      application/json:
        schema:
          type: object
`;

const createTagOperation = `operationId: createTag
tags:
  - Tags
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        properties:
          id:
            type: string
            readOnly: true
          name:
            type: string
        required:
          - name
responses:
  '201':
    description: Created
`;

describe('readSpecOperations', () => {
	const dirs: string[] = [];
	afterEach(() => {
		for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
	});

	it('reads operations, resolves references and skips pagination and read-only fields', async () => {
		const dir = writeSpec({
			[ROOT]: root(
				'  /tags:\n    get:\n      $ref: ./getTags.yml\n    post:\n      $ref: ./createTag.yml\n',
			),
			'getTags.yml': tagsOperation,
			'createTag.yml': createTagOperation,
			'limit.yml': 'name: limit\nin: query\nschema:\n  type: number\n',
		});
		dirs.push(dir);

		const operations = await readSpecOperations(dir);

		expect(operations.map((op) => [op.operationId, op.method, op.apiPath])).toEqual([
			['createTag', 'POST', '/tags'],
			['getTags', 'GET', '/tags'],
		]);
		const [createTag, getTags] = operations;
		expect(getTags).toMatchObject({ paginated: true, scope: 'tag:list', emptyResponse: false });
		expect(getTags.parameters.map((p) => p.wire)).toEqual(['query:withUsage']);
		expect(createTag).toMatchObject({ emptyResponse: true, paginated: false });
		expect(createTag.parameters.map((p) => [p.wire, p.required])).toEqual([['body:name', true]]);
	});

	it('fails when a reference in the spec cannot be resolved', async () => {
		const dir = writeSpec({
			[ROOT]: root('  /tags:\n    get:\n      $ref: ./missing.yml\n'),
		});
		dirs.push(dir);

		await expect(readSpecOperations(dir)).rejects.toThrow('Cannot read the public API spec');
	});
});
