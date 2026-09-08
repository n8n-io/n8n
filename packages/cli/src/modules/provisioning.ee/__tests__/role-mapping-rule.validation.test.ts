import type { Role } from '@n8n/db';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import {
	assertAndNormalizeProjectIdsForRuleType,
	assertRoleCompatibleWithMappingType,
} from '../role-mapping-rule.validation';

const globalRole = { roleType: 'global' } as Role;
const projectRole = { roleType: 'project' } as Role;

describe('role-mapping-rule.validation', () => {
	describe('assertRoleCompatibleWithMappingType', () => {
		it('should accept global role for instance mapping', () => {
			expect(() => assertRoleCompatibleWithMappingType(globalRole, 'instance')).not.toThrow();
		});

		it('should reject project role for instance mapping', () => {
			expect(() => assertRoleCompatibleWithMappingType(projectRole, 'instance')).toThrow(
				BadRequestError,
			);
		});

		it('should accept project role for project mapping', () => {
			expect(() => assertRoleCompatibleWithMappingType(projectRole, 'project')).not.toThrow();
		});

		it('should reject global role for project mapping', () => {
			expect(() => assertRoleCompatibleWithMappingType(globalRole, 'project')).toThrow(
				BadRequestError,
			);
		});
	});

	describe('assertAndNormalizeProjectIdsForRuleType', () => {
		it('should return [] for instance type', () => {
			expect(assertAndNormalizeProjectIdsForRuleType('instance', undefined, ['x'])).toEqual([]);
		});

		it('should reject non-empty explicit projectIds for instance type', () => {
			expect(() => assertAndNormalizeProjectIdsForRuleType('instance', ['a'], [])).toThrow(
				BadRequestError,
			);
		});

		it('should require non-empty ids for project type with no fallback', () => {
			expect(() => assertAndNormalizeProjectIdsForRuleType('project', undefined, [])).toThrow(
				BadRequestError,
			);
		});

		it('should use fallback when explicit is omitted for project type', () => {
			expect(assertAndNormalizeProjectIdsForRuleType('project', undefined, ['p1', 'p1'])).toEqual([
				'p1',
			]);
		});

		it('should dedupe explicit project ids for project type', () => {
			expect(assertAndNormalizeProjectIdsForRuleType('project', ['a', 'a', 'b'], [])).toEqual([
				'a',
				'b',
			]);
		});
	});
});
