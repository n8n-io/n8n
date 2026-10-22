import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

import { isRecord } from '@n8n/utils/is-record';

const pathsDir = path.join(__dirname, '../spec/paths');
const sharedSchemasDir = path.join(__dirname, '../../../shared/spec/schemas');

const readSpec = (filePath: string): unknown => parse(fs.readFileSync(filePath, 'utf8'));

// Returns the `items.properties` of every `nodes` array schema under a value.
const findNodeItemProperties = (value: unknown): Array<Record<string, unknown>> => {
	if (Array.isArray(value)) return value.flatMap(findNodeItemProperties);
	if (!isRecord(value)) return [];

	const found = Object.values(value).flatMap(findNodeItemProperties);
	const nodes = value.nodes;
	if (isRecord(nodes) && isRecord(nodes.items) && isRecord(nodes.items.properties)) {
		found.push(nodes.items.properties);
	}
	return found;
};

// Collects node schemas from response sections of path fragments and from shared schemas.
const collectResponseNodeSchemas = (): Array<[string, Record<string, unknown>]> => {
	const pathSchemas = fs
		.readdirSync(pathsDir)
		.filter((file) => file.endsWith('.generated.yml'))
		.flatMap((file): Array<[string, Record<string, unknown>]> => {
			const doc = readSpec(path.join(pathsDir, file));
			const responses = isRecord(doc) ? doc.responses : undefined;
			return findNodeItemProperties(responses).map((properties) => [file, properties]);
		});

	const sharedSchemas = fs
		.readdirSync(sharedSchemasDir)
		.filter((file) => file.endsWith('.generated.yml'))
		.flatMap((file): Array<[string, Record<string, unknown>]> => {
			const doc = readSpec(path.join(sharedSchemasDir, file));
			return findNodeItemProperties(doc).map((properties) => [file, properties]);
		});

	return [...pathSchemas, ...sharedSchemas];
};

describe('workflow node schema in OpenAPI', () => {
	const responseNodeSchemas = collectResponseNodeSchemas();

	test('finds response node schemas in the generated spec', () => {
		const sources = responseNodeSchemas.map(([source]) => source);

		expect(sources).toEqual(
			expect.arrayContaining([
				'getWorkflows.generated.yml',
				'getWorkflow.generated.yml',
				'workflowPublicDto.generated.yml',
			]),
		);
	});

	test.each(responseNodeSchemas)(
		'does not document timestamps on response nodes in %s',
		(_source, properties) => {
			expect(properties).not.toHaveProperty('createdAt');
			expect(properties).not.toHaveProperty('updatedAt');
		},
	);

	test.each(['createWorkflow', 'updateWorkflow'])(
		'keeps node timestamps as read-only in the request body of %s',
		(route) => {
			const doc = readSpec(path.join(pathsDir, `${route}.generated.yml`));
			const [requestNodes] = findNodeItemProperties(isRecord(doc) ? doc.requestBody : undefined);

			expect(requestNodes.createdAt).toMatchObject({ type: 'string', readOnly: true });
			expect(requestNodes.updatedAt).toMatchObject({ type: 'string', readOnly: true });
		},
	);
});
