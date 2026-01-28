import { CurrentsApi } from '../../../credentials/CurrentsApi.credentials';
import { Currents } from '../Currents.node';
import { actionOperations, actionFields } from '../descriptions/ActionDescription';
import { projectRLC } from '../descriptions/common.descriptions';
import { instanceOperations, instanceFields } from '../descriptions/InstanceDescription';
import { projectOperations, projectFields } from '../descriptions/ProjectDescription';
import { runOperations, runFields } from '../descriptions/RunDescription';
import { signatureOperations, signatureFields } from '../descriptions/SignatureDescription';
import { specFileOperations, specFileFields } from '../descriptions/SpecFileDescription';
import { testOperations, testFields } from '../descriptions/TestDescription';
import { testResultOperations, testResultFields } from '../descriptions/TestResultDescription';
import { listSearch } from '../methods';

describe('Currents Node Structure', () => {
	describe('Currents class', () => {
		it('should be a valid node class', () => {
			const node = new Currents();
			expect(node.description).toBeDefined();
			expect(node.description.name).toBe('currents');
			expect(node.description.displayName).toBe('Currents');
		});

		it('should have correct credentials', () => {
			const node = new Currents();
			expect(node.description.credentials).toContainEqual(
				expect.objectContaining({ name: 'currentsApi' }),
			);
		});

		it('should have all resource types', () => {
			const node = new Currents();
			const resourceProperty = node.description.properties.find((p) => p.name === 'resource');
			expect(resourceProperty).toBeDefined();

			const options = resourceProperty?.options as Array<{ value: string }>;
			const resourceValues = options?.map((o) => o.value) ?? [];

			expect(resourceValues).toContain('action');
			expect(resourceValues).toContain('instance');
			expect(resourceValues).toContain('project');
			expect(resourceValues).toContain('run');
			expect(resourceValues).toContain('signature');
			expect(resourceValues).toContain('specFile');
			expect(resourceValues).toContain('test');
			expect(resourceValues).toContain('testResult');
		});
	});

	describe('Credentials', () => {
		it('should be a valid credential class', () => {
			const cred = new CurrentsApi();
			expect(cred.name).toBe('currentsApi');
			expect(cred.displayName).toBe('Currents API');
			expect(cred.properties).toBeDefined();
			expect(Array.isArray(cred.properties)).toBe(true);
		});
	});

	describe('Methods', () => {
		it('should export listSearch with getProjects', () => {
			expect(listSearch).toBeDefined();
			expect(listSearch.getProjects).toBeDefined();
			expect(typeof listSearch.getProjects).toBe('function');
		});
	});

	describe('Description exports', () => {
		const descriptionPairs = [
			{ name: 'action', operations: actionOperations, fields: actionFields },
			{ name: 'instance', operations: instanceOperations, fields: instanceFields },
			{ name: 'project', operations: projectOperations, fields: projectFields },
			{ name: 'run', operations: runOperations, fields: runFields },
			{ name: 'signature', operations: signatureOperations, fields: signatureFields },
			{ name: 'specFile', operations: specFileOperations, fields: specFileFields },
			{ name: 'test', operations: testOperations, fields: testFields },
			{ name: 'testResult', operations: testResultOperations, fields: testResultFields },
		];

		it.each(descriptionPairs)(
			'$name should export valid operations and fields arrays',
			({ operations, fields }) => {
				expect(Array.isArray(operations)).toBe(true);
				expect(operations.length).toBeGreaterThan(0);
				expect(Array.isArray(fields)).toBe(true);
			},
		);

		it('should export projectRLC as a valid resource locator', () => {
			expect(projectRLC).toBeDefined();
			expect(projectRLC.name).toBe('projectId');
			expect(projectRLC.type).toBe('resourceLocator');
		});
	});
});
