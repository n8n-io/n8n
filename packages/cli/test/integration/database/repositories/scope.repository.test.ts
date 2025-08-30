import { testDb } from '@n8n/backend-test-utils';
import { type Scope, ScopeRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope as ScopeType } from '@n8n/permissions';

import { createScope, createScopes, createTestScopes } from '../../shared/db/roles';

describe('ScopeRepository', () => {
	let scopeRepository: ScopeRepository;

	beforeAll(async () => {
		await testDb.init();
		scopeRepository = Container.get(ScopeRepository);
	});

	beforeEach(async () => {
		// Truncate in the correct order to respect foreign key constraints
		// user table references role via roleSlug
		// project_relation references role
		// role_scope references scope, so truncate it first
		await testDb.truncate(['User', 'ProjectRelation', 'Role', 'Scope']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findByList()', () => {
		describe('successful queries', () => {
			it('should return empty array when given empty slug array', async () => {
				//
				// ARRANGE
				//
				await createTestScopes(); // Create some scopes but don't query for them

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList([]);

				//
				// ASSERT
				//
				expect(scopes).toEqual([]);
			});

			it('should return empty array when no scopes exist', async () => {
				//
				// ARRANGE & ACT
				//
				const scopes = await scopeRepository.findByList(['non-existent:scope']);

				//
				// ASSERT
				//
				expect(scopes).toEqual([]);
			});

			it('should return single scope when one slug matches', async () => {
				//
				// ARRANGE
				//
				const { readScope } = await createTestScopes();

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList([readScope.slug]);

				//
				// ASSERT
				//
				expect(scopes).toHaveLength(1);
				expect(scopes[0]).toEqual(
					expect.objectContaining({
						slug: readScope.slug,
						displayName: readScope.displayName,
						description: readScope.description,
					}),
				);
			});

			it('should return multiple scopes when multiple slugs match', async () => {
				//
				// ARRANGE
				//
				const { readScope, writeScope, deleteScope, adminScope } = await createTestScopes();

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList([
					readScope.slug,
					writeScope.slug,
					deleteScope.slug,
				]);

				//
				// ASSERT
				//
				expect(scopes).toHaveLength(3);
				expect(scopes).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ slug: readScope.slug }),
						expect.objectContaining({ slug: writeScope.slug }),
						expect.objectContaining({ slug: deleteScope.slug }),
					]),
				);

				// Verify adminScope is NOT included
				expect(scopes.find((s) => s.slug === adminScope.slug)).toBeUndefined();
			});

			it('should return all existing scopes when all slugs match', async () => {
				//
				// ARRANGE
				//
				const { readScope, writeScope, deleteScope, adminScope } = await createTestScopes();

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList([
					readScope.slug,
					writeScope.slug,
					deleteScope.slug,
					adminScope.slug,
				]);

				//
				// ASSERT
				//
				expect(scopes).toHaveLength(4);
				expect(scopes).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ slug: readScope.slug }),
						expect.objectContaining({ slug: writeScope.slug }),
						expect.objectContaining({ slug: deleteScope.slug }),
						expect.objectContaining({ slug: adminScope.slug }),
					]),
				);
			});
		});

		describe('partial matches', () => {
			it('should return only existing scopes when some slugs do not exist', async () => {
				//
				// ARRANGE
				//
				const { readScope, writeScope } = await createTestScopes();

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList([
					readScope.slug,
					'non-existent:scope:1' as ScopeType,
					writeScope.slug,
					'non-existent:scope:2' as ScopeType,
				]);

				//
				// ASSERT
				//
				expect(scopes).toHaveLength(2);
				expect(scopes).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ slug: readScope.slug }),
						expect.objectContaining({ slug: writeScope.slug }),
					]),
				);
			});

			it('should return empty array when none of the slugs exist', async () => {
				//
				// ARRANGE
				//
				await createTestScopes(); // Create scopes but don't query for them

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList([
					'non-existent:scope:1' as ScopeType,
					'non-existent:scope:2' as ScopeType,
					'non-existent:scope:3' as ScopeType,
				]);

				//
				// ASSERT
				//
				expect(scopes).toEqual([]);
			});
		});

		describe('duplicate handling', () => {
			it('should return each scope only once when slug array contains duplicates', async () => {
				//
				// ARRANGE
				//
				const { readScope, writeScope } = await createTestScopes();

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList([
					readScope.slug,
					writeScope.slug,
					readScope.slug, // Duplicate
					writeScope.slug, // Duplicate
					readScope.slug, // Another duplicate
				]);

				//
				// ASSERT
				//
				expect(scopes).toHaveLength(2);
				expect(scopes).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ slug: readScope.slug }),
						expect.objectContaining({ slug: writeScope.slug }),
					]),
				);

				// Verify no duplicates in result
				const slugs = scopes.map((s) => s.slug);
				const uniqueSlugs = [...new Set(slugs)];
				expect(slugs).toEqual(uniqueSlugs);
			});

			it('should handle mix of valid, invalid, and duplicate slugs', async () => {
				//
				// ARRANGE
				//
				const { readScope } = await createTestScopes();

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList([
					readScope.slug,
					'invalid:scope:1' as ScopeType,
					readScope.slug, // Duplicate valid
					'invalid:scope:2' as ScopeType,
					'invalid:scope:1' as ScopeType, // Duplicate invalid
					readScope.slug, // Another duplicate valid
				]);

				//
				// ASSERT
				//
				expect(scopes).toHaveLength(1);
				expect(scopes[0]).toEqual(expect.objectContaining({ slug: readScope.slug }));
			});
		});

		describe('large datasets', () => {
			it('should handle querying for many scopes efficiently', async () => {
				//
				// ARRANGE
				//
				const createdScopes = await createScopes(50, { description: 'Bulk test scope' });
				const slugsToQuery = createdScopes.slice(0, 25).map((s) => s.slug);

				//
				// ACT
				//
				const startTime = Date.now();
				const scopes = await scopeRepository.findByList(slugsToQuery);
				const endTime = Date.now();

				//
				// ASSERT
				//
				expect(scopes).toHaveLength(25);
				expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

				// Verify all requested scopes are returned
				const returnedSlugs = scopes.map((s) => s.slug).sort();
				const expectedSlugs = slugsToQuery.sort();
				expect(returnedSlugs).toEqual(expectedSlugs);
			});

			it('should maintain data integrity with complex scope structures', async () => {
				//
				// ARRANGE
				//
				const complexScopes = await Promise.all([
					createScope({
						slug: 'complex:scope:with:colons' as ScopeType,
						displayName: 'Complex Scope With Colons',
						description: 'A scope with multiple colons in the slug',
					}),
					createScope({
						slug: 'scope-with-dashes' as ScopeType,
						displayName: 'Scope With Dashes',
						description: 'A scope with dashes',
					}),
					createScope({
						slug: 'scope_with_underscores' as ScopeType,
						displayName: 'Scope With Underscores',
						description: 'A scope with underscores',
					}),
				]);

				const slugsToQuery = complexScopes.map((s) => s.slug);

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList(slugsToQuery);

				//
				// ASSERT
				//
				expect(scopes).toHaveLength(3);

				for (const originalScope of complexScopes) {
					const foundScope = scopes.find((s) => s.slug === originalScope.slug);
					expect(foundScope).toBeDefined();
					expect(foundScope!.displayName).toBe(originalScope.displayName);
					expect(foundScope!.description).toBe(originalScope.description);
				}
			});
		});

		describe('edge cases and validation', () => {
			it('should handle null and undefined values gracefully', async () => {
				//
				// ARRANGE
				//
				const scope = await createScope({
					slug: 'scope-with-nulls' as ScopeType,
					displayName: null,
					description: null,
				});

				//
				// ACT
				//
				const scopes = await scopeRepository.findByList([scope.slug]);

				//
				// ASSERT
				//
				expect(scopes).toHaveLength(1);
				expect(scopes[0].slug).toBe(scope.slug);
				expect(scopes[0].displayName).toBeNull();
				expect(scopes[0].description).toBeNull();
			});

			it('should preserve order consistency across multiple queries', async () => {
				//
				// ARRANGE
				//
				const { readScope, writeScope, deleteScope, adminScope } = await createTestScopes();
				const slugsToQuery = [adminScope.slug, readScope.slug, deleteScope.slug, writeScope.slug];

				//
				// ACT
				//
				const scopes1 = await scopeRepository.findByList(slugsToQuery);
				const scopes2 = await scopeRepository.findByList(slugsToQuery);
				const scopes3 = await scopeRepository.findByList(slugsToQuery);

				//
				// ASSERT
				//
				expect(scopes1).toHaveLength(4);
				expect(scopes2).toHaveLength(4);
				expect(scopes3).toHaveLength(4);

				// All queries should return the same scopes (though order may vary due to SQL implementation)
				const getSortedSlugs = (scopeList: Scope[]) => scopeList.map((s) => s.slug).sort();

				expect(getSortedSlugs(scopes1)).toEqual(getSortedSlugs(scopes2));
				expect(getSortedSlugs(scopes2)).toEqual(getSortedSlugs(scopes3));
			});

			it('should verify database state remains consistent after queries', async () => {
				//
				// ARRANGE
				//
				const { readScope, writeScope } = await createTestScopes();

				//
				// ACT
				//
				const scopesBefore = await scopeRepository.find();
				await scopeRepository.findByList([readScope.slug, writeScope.slug]);
				const scopesAfter = await scopeRepository.find();

				//
				// ASSERT
				//
				expect(scopesBefore).toHaveLength(4); // readScope, writeScope, deleteScope, adminScope
				expect(scopesAfter).toHaveLength(4);
				expect(scopesBefore.map((s) => s.slug).sort()).toEqual(
					scopesAfter.map((s) => s.slug).sort(),
				);

				// Verify specific scopes are unchanged
				const readScopeBefore = scopesBefore.find((s) => s.slug === readScope.slug);
				const readScopeAfter = scopesAfter.find((s) => s.slug === readScope.slug);
				expect(readScopeBefore).toEqual(readScopeAfter);
			});
		});
	});
});
