import '../../controllers';

import { ApplyPackageResultDto } from '@n8n/api-types';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { OpenAPIV3 } from 'openapi-types';
import { parse } from 'yaml';
import fs from 'node:fs';
import path from 'node:path';

import { PromotionsPublicController } from '../../controllers/promotions.public.controller';

import { getGeneratedArtifacts } from '../generate';

/**
 * Drift guard: the `*.generated.yml` files are committed to the repo AND regenerated in place by
 * `build:data` on every build. This asserts the committed copies still match a fresh generation.
 */
const V1_DIR = path.resolve(__dirname, '../..');

describe('generated OpenAPI spec is up to date', () => {
	it.each(getGeneratedArtifacts())(
		'committed $outputPath matches a fresh generation',
		({ outputPath, content }) => {
			const committed = fs.readFileSync(path.join(V1_DIR, outputPath), 'utf8');
			expect(committed).toBe(content);
		},
	);
});

describe('Apply response documentation', () => {
	it.each(['applyPackage', 'continueApplyPackage'])(
		'%s exposes all outcomes and the required gates',
		(handler) => {
			const route = Container.get(ControllerRegistryMetadata)
				.getControllerMetadata(PromotionsPublicController as never)
				.routes.get(handler);
			expect(route?.responseDto).toBe(ApplyPackageResultDto);
			expect(route?.accessScope).toEqual({ scope: 'gitConnection:pull', globalOnly: true });
			expect(route?.apiKeyScope).toBe('gitConnection:pull');
			expect(route?.licenseFeature).toBe('feat:gitConnections');
			const artifacts = getGeneratedArtifacts();
			const outputPath = `handlers/promotions/spec/paths/${handler}.generated.yml`;
			const operation = parse(
				artifacts.find((artifact) => artifact.outputPath === outputPath)!.content,
			) as OpenAPIV3.OperationObject;
			const response = operation.responses['200'] as OpenAPIV3.ResponseObject;
			const schema = response.content?.['application/json'].schema as OpenAPIV3.ReferenceObject;
			expect(schema).toEqual({
				$ref: '../../../../shared/spec/schemas/applyPackageResultDto.generated.yml',
			});
			const schemaPath = path.posix.normalize(
				path.posix.join(path.posix.dirname(outputPath), schema.$ref),
			);
			const result = parse(
				artifacts.find((artifact) => artifact.outputPath === schemaPath)!.content,
			) as OpenAPIV3.SchemaObject;
			const outcomes = result.oneOf as OpenAPIV3.SchemaObject[];
			expect(outcomes).toHaveLength(3);
			for (const [status, fields] of [
				['applied', ['counts', 'warnings']],
				['blocked', ['preflight']],
				['source-changed', []],
			] as const) {
				const outcome = outcomes.find(
					(candidate) =>
						(candidate.properties?.status as OpenAPIV3.SchemaObject).enum?.[0] === status,
				);
				expect(outcome?.required).toEqual(
					expect.arrayContaining(['status', 'connectionId', 'configId', 'git', ...fields]),
				);
				if (status !== 'applied') expect(outcome?.properties).not.toHaveProperty('counts');
			}
		},
	);
});
