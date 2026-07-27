import type { LicenseState } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { VariableMissingMode } from '../../n8n-packages.types';
import { assertPackageImportApiKeyScopes, assertVariableCreationAllowed } from '../import-gates';

const licensed = mock<LicenseState>({ isVariablesLicensed: () => true });
const unlicensed = mock<LicenseState>({ isVariablesLicensed: () => false });

describe('assertPackageImportApiKeyScopes', () => {
	it('allows internal callers, who carry no API key at all', () => {
		expect(() => assertPackageImportApiKeyScopes(undefined, ['variable:create'])).not.toThrow();
	});

	it('allows a key carrying every required scope', () => {
		expect(() =>
			assertPackageImportApiKeyScopes(
				['variable:create', 'workflow:import'],
				['workflow:import', 'variable:create'],
			),
		).not.toThrow();
	});

	it('rejects a key missing any one of the required scopes', () => {
		expect(() =>
			assertPackageImportApiKeyScopes(['workflow:import'], ['workflow:import', 'variable:create']),
		).toThrow(ForbiddenError);
	});

	it('allows a scopeless key when the package requires nothing', () => {
		expect(() => assertPackageImportApiKeyScopes([], [])).not.toThrow();
	});
});

describe('assertVariableCreationAllowed', () => {
	const gate = (overrides: Partial<Parameters<typeof assertVariableCreationAllowed>[0]> = {}) =>
		assertVariableCreationAllowed({
			licenseState: licensed,
			apiKeyScopes: undefined,
			missingMode: VariableMissingMode.CreateStub,
			hasRequirements: true,
			...overrides,
		});

	it('allows a licensed creating import that requires variables', () => {
		expect(() => gate()).not.toThrow();
	});

	it('rejects a creating import when the licence does not cover variables', () => {
		expect(() => gate({ licenseState: unlicensed })).toThrow(ForbiddenError);
	});

	it.each([VariableMissingMode.DoNothing, VariableMissingMode.MustPreexist])(
		'skips the licence check under %s, which creates nothing',
		(missingMode) => {
			expect(() => gate({ licenseState: unlicensed, missingMode })).not.toThrow();
		},
	);

	it('skips the licence check when the package references no variables', () => {
		expect(() => gate({ licenseState: unlicensed, hasRequirements: false })).not.toThrow();
	});

	it('rejects a key without variable:create once the licence check passes', () => {
		expect(() => gate({ apiKeyScopes: ['workflow:import'] })).toThrow(ForbiddenError);
	});

	it('allows a key carrying variable:create', () => {
		expect(() => gate({ apiKeyScopes: ['workflow:import', 'variable:create'] })).not.toThrow();
	});

	it('checks the licence before the API key, so an unlicensed instance says so', () => {
		expect(() => gate({ licenseState: unlicensed, apiKeyScopes: [] })).toThrow(
			/license does not allow variables/,
		);
	});
});
