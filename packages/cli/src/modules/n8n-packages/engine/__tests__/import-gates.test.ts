import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import {
	assertPackageImportApiKeyScopes,
	assertTagWritesAllowed,
	assertVariableWritesAllowed,
} from '../import-gates';

describe('import gates', () => {
	describe('assertPackageImportApiKeyScopes', () => {
		it('allows undefined API key scopes', () => {
			expect(() => assertPackageImportApiKeyScopes(undefined, ['variable:create'])).not.toThrow();
		});

		it('allows required scopes that are present', () => {
			expect(() =>
				assertPackageImportApiKeyScopes(
					['variable:create', 'variable:update'],
					['variable:create'],
				),
			).not.toThrow();
		});

		it('throws when a required scope is missing', () => {
			expect(() =>
				assertPackageImportApiKeyScopes(['variable:create'], ['variable:update']),
			).toThrow(ForbiddenError);
		});

		it('requires every requested scope', () => {
			expect(() =>
				assertPackageImportApiKeyScopes(
					['variable:create'],
					['variable:create', 'variable:update'],
				),
			).toThrow(ForbiddenError);
		});
	});

	describe('assertVariableWritesAllowed', () => {
		const licensed = {
			isVariablesLicensed: () => true,
		};

		const unlicensed = {
			isVariablesLicensed: () => false,
		};

		it('allows imports that do not write variables', () => {
			expect(() =>
				assertVariableWritesAllowed({
					licenseState: unlicensed,
					apiKeyScopes: undefined,
					hasCreations: false,
					hasOverwrites: false,
				}),
			).not.toThrow();
		});

		it('rejects variable writes without a variables license', () => {
			expect(() =>
				assertVariableWritesAllowed({
					licenseState: unlicensed,
					apiKeyScopes: ['variable:create', 'variable:update'],
					hasCreations: true,
					hasOverwrites: false,
				}),
			).toThrow(ForbiddenError);
		});

		it('requires variable:create for creations', () => {
			expect(() =>
				assertVariableWritesAllowed({
					licenseState: licensed,
					apiKeyScopes: [],
					hasCreations: true,
					hasOverwrites: false,
				}),
			).toThrow(ForbiddenError);
		});

		it('requires variable:update for overwrites', () => {
			expect(() =>
				assertVariableWritesAllowed({
					licenseState: licensed,
					apiKeyScopes: [],
					hasCreations: false,
					hasOverwrites: true,
				}),
			).toThrow(ForbiddenError);
		});

		it('allows licensed creations with variable:create', () => {
			expect(() =>
				assertVariableWritesAllowed({
					licenseState: licensed,
					apiKeyScopes: ['variable:create'],
					hasCreations: true,
					hasOverwrites: false,
				}),
			).not.toThrow();
		});

		it('allows licensed overwrites with variable:update', () => {
			expect(() =>
				assertVariableWritesAllowed({
					licenseState: licensed,
					apiKeyScopes: ['variable:update'],
					hasCreations: false,
					hasOverwrites: true,
				}),
			).not.toThrow();
		});

		it('requires both scopes when creating and overwriting', () => {
			expect(() =>
				assertVariableWritesAllowed({
					licenseState: licensed,
					apiKeyScopes: ['variable:create'],
					hasCreations: true,
					hasOverwrites: true,
				}),
			).toThrow(ForbiddenError);
		});

		it('allows both operations when both scopes are present', () => {
			expect(() =>
				assertVariableWritesAllowed({
					licenseState: licensed,
					apiKeyScopes: ['variable:create', 'variable:update'],
					hasCreations: true,
					hasOverwrites: true,
				}),
			).not.toThrow();
		});
	});

	describe('assertTagWritesAllowed', () => {
		it('allows plans that do not write tags', () => {
			expect(() => assertTagWritesAllowed(undefined, [])).not.toThrow();
		});

		it('requires tag:create for tag creations', () => {
			expect(() =>
				assertTagWritesAllowed(
					[],
					[
						{
							creations: [{}],
							renames: [],
							reconciles: [],
						} as any,
					],
				),
			).toThrow(ForbiddenError);
		});

		it('requires tag:update for tag renames', () => {
			expect(() =>
				assertTagWritesAllowed(
					[],
					[
						{
							creations: [],
							renames: [{}],
							reconciles: [],
						} as any,
					],
				),
			).toThrow(ForbiddenError);
		});

		it('requires tag:update for tag reconciles', () => {
			expect(() =>
				assertTagWritesAllowed(
					[],
					[
						{
							creations: [],
							renames: [],
							reconciles: [{}],
						} as any,
					],
				),
			).toThrow(ForbiddenError);
		});

		it('allows all tag writes when required scopes are present', () => {
			expect(() =>
				assertTagWritesAllowed(
					['tag:create', 'tag:update'],
					[
						{
							creations: [{}],
							renames: [{}],
							reconciles: [{}],
						} as any,
					],
				),
			).not.toThrow();
		});
	});
});
