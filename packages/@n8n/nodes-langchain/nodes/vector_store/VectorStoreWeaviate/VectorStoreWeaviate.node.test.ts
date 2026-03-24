import * as fs from 'fs';
import * as path from 'path';

/**
 * Regression test for GHC-7116
 * @see https://github.com/n8n-io/n8n/issues/26579
 *
 * Bug: Weaviate Vector Store node options with `default: undefined` cannot be added via UI dropdown.
 * When clicking "Tenant Name", "GRPC Proxy", or "Hybrid: Auto Cut Limit" in the "Add Option" dropdown,
 * the field is not added to the options panel.
 *
 * Root cause: String and number type properties must have concrete default values, not `undefined`.
 * The UI fails to instantiate options with `default: undefined`.
 *
 * Affected fields in shared_options:
 * - tenant (string) - line 108
 * - proxy_grpc (string) - line 156
 * - autoCutLimit (number) - line 248
 * - maxVectorDistance (number) - line 274
 */

describe('VectorStoreWeaviate Node - GHC-7116 Regression', () => {
	let sourceFile: string;

	beforeAll(() => {
		// Read the source file once for all tests
		sourceFile = fs.readFileSync(
			path.join(__dirname, 'VectorStoreWeaviate.node.ts'),
			'utf8',
		);
	});

	describe('shared_options should not have undefined defaults', () => {
		/**
		 * This test validates that no field definitions in the source file
		 * have `default: undefined` for string/number types.
		 */

		it('should reject tenant field with undefined default', () => {
			// Check for the pattern: tenant field with default: undefined
			const tenantFieldPattern = /displayName:\s*['"]Tenant Name['"][\s\S]{0,200}?default:\s*undefined/;
			const hasTenantIssue = tenantFieldPattern.test(sourceFile);

			expect(hasTenantIssue).toBe(false);
			if (hasTenantIssue) {
				throw new Error(
					'GHC-7116: "Tenant Name" field has invalid default: undefined. This prevents the field from being added via the UI dropdown. Change to default: ""',
				);
			}
		});

		it('should reject proxy_grpc field with undefined default', () => {
			// Check for the pattern: proxy_grpc field with default: undefined
			const proxyGrpcPattern = /displayName:\s*['"]GRPC Proxy['"][\s\S]{0,200}?default:\s*undefined/;
			const hasProxyGrpcIssue = proxyGrpcPattern.test(sourceFile);

			expect(hasProxyGrpcIssue).toBe(false);
			if (hasProxyGrpcIssue) {
				throw new Error(
					'GHC-7116: "GRPC Proxy" field has invalid default: undefined. This prevents the field from being added via the UI dropdown. Change to default: ""',
				);
			}
		});

		it('should reject autoCutLimit field with undefined default', () => {
			// Check for the pattern: autoCutLimit field with default: undefined
			const autoCutLimitPattern =
				/displayName:\s*['"]Hybrid:\s*Auto\s*Cut\s*Limit['"][\s\S]{0,200}?default:\s*undefined/;
			const hasAutoCutLimitIssue = autoCutLimitPattern.test(sourceFile);

			expect(hasAutoCutLimitIssue).toBe(false);
			if (hasAutoCutLimitIssue) {
				throw new Error(
					'GHC-7116: "Hybrid: Auto Cut Limit" field has invalid default: undefined. This prevents the field from being added via the UI dropdown. For optional number fields, use a concrete default or 0',
				);
			}
		});

		it('should reject maxVectorDistance field with undefined default', () => {
			// Check for the pattern: maxVectorDistance field with default: undefined
			const maxVectorDistancePattern =
				/displayName:\s*['"]Hybrid:\s*Max\s*Vector\s*Distance['"][\s\S]{0,200}?default:\s*undefined/;
			const hasMaxVectorDistanceIssue = maxVectorDistancePattern.test(sourceFile);

			expect(hasMaxVectorDistanceIssue).toBe(false);
			if (hasMaxVectorDistanceIssue) {
				throw new Error(
					'GHC-7116: "Hybrid: Max Vector Distance" field has invalid default: undefined. This prevents the field from being added via the UI dropdown. For optional number fields, use a concrete default or 0',
				);
			}
		});

		it('should document the fix for future developers', () => {
			// This test serves as documentation for the fix
			const fix = {
				issue: 'GHC-7116',
				problem: 'Fields with default: undefined cannot be added via UI dropdown',
				affectedFields: ['tenant', 'proxy_grpc', 'autoCutLimit', 'maxVectorDistance'],
				solution: {
					stringFields: 'Change default: undefined to default: ""',
					numberFields:
						'For optional number fields, use a concrete default (e.g., 0) or make them truly optional by handling undefined in the execution logic',
				},
				file: 'packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreWeaviate/VectorStoreWeaviate.node.ts',
				lines: {
					tenant: 108,
					proxy_grpc: 156,
					autoCutLimit: 248,
					maxVectorDistance: 274,
				},
			};

			// This assertion will always pass but documents the fix clearly
			expect(fix.affectedFields).toHaveLength(4);
			expect(fix.solution.stringFields).toBeDefined();
			expect(fix.solution.numberFields).toBeDefined();
		});
	});
});
