import '../../controllers';

import { ApplyPackageResultDto } from '@n8n/api-types';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { OpenAPIV3 } from 'openapi-types';
import { parse } from 'yaml';
import fs from 'node:fs';
import path from 'node:path';

import { resolvePublicApiRoutes } from '@/public-api/public-api-route-resolver';

import { PromotionsPublicController } from '../../controllers/promotions.public.controller';

import { getGeneratedArtifacts } from '../generate';

/**
 * Drift guard: the `*.generated.yml` files are committed to the repo AND regenerated in place by
 * `build:data` on every build. This asserts the committed copies still match a fresh generation.
 */
const V1_DIR = path.resolve(__dirname, '../..');

describe('OpenTelemetry settings route', () => {
	it('registers PUT /settings/otel with a body and the manage scope', () => {
		const route = resolvePublicApiRoutes().find(
			({ path: routePath, method }) => routePath === '/settings/otel' && method === 'put',
		);
		expect(route?.apiKeyScope).toBe('otel:manage');
		expect(route?.requestBodyDto).toBeDefined();
		expect(route?.successStatus).toBe(200);
	});

	it('keeps every field and field description from the legacy settings schema', () => {
		const legacy = parse(
			fs.readFileSync(path.join(V1_DIR, 'handlers/otel/spec/schemas/otel-settings.yml'), 'utf8'),
		) as OpenAPIV3.SchemaObject;
		const generated = parse(
			fs.readFileSync(
				path.join(V1_DIR, 'handlers/settings/spec/paths/updateOtelSettings.generated.yml'),
				'utf8',
			),
		) as OpenAPIV3.OperationObject;
		const request = generated.requestBody as OpenAPIV3.RequestBodyObject;
		const requestSchema = request.content['application/json'].schema as OpenAPIV3.SchemaObject;
		const response = generated.responses['200'] as OpenAPIV3.ResponseObject;
		const responseSchema = response.content?.['application/json'].schema as OpenAPIV3.SchemaObject;

		for (const schema of [requestSchema, responseSchema]) {
			expect(Object.keys(schema.properties ?? {}).sort()).toEqual(
				Object.keys(legacy.properties ?? {}).sort(),
			);
			expect(schema.description?.trimEnd()).toBe(legacy.description?.trimEnd());
			expect(schema.additionalProperties).toBe(false);
			expect(schema.required).toEqual(expect.arrayContaining(legacy.required ?? []));
			for (const [key, field] of Object.entries(legacy.properties ?? {})) {
				const oldField = field as OpenAPIV3.SchemaObject;
				const newField = schema.properties?.[key] as OpenAPIV3.SchemaObject;
				for (const property of [
					'type',
					'format',
					'enum',
					'default',
					'minLength',
					'minimum',
					'maximum',
					'description',
					'example',
				] as const) {
					if (property === 'description') {
						expect(newField.description?.trimEnd()).toBe(oldField.description?.trimEnd());
					} else {
						expect(newField[property]).toEqual(oldField[property]);
					}
				}
			}
		}
	});
});

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
