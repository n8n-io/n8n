/**
 * Comprehensive test suite for LicenseState functionality
 */

import type { BooleanLicenseFeature } from '@n8n/constants';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { LicenseState } from '../license-state';
import type { LicenseProvider } from '../types';

describe('LicenseState', () => {
	let licenseState: LicenseState;
	let mockLicenseProvider: jest.Mocked<LicenseProvider>;

	beforeEach(() => {
		jest.resetAllMocks();
		Container.reset();

		licenseState = new LicenseState();
		mockLicenseProvider = mock<LicenseProvider>();
	});

	describe('License Provider Management', () => {
		describe('setLicenseProvider', () => {
			it('should set the license provider successfully', () => {
				licenseState.setLicenseProvider(mockLicenseProvider);

				expect(licenseState.licenseProvider).toBe(mockLicenseProvider);
			});

			it('should allow replacing an existing license provider', () => {
				const firstProvider = mock<LicenseProvider>();
				const secondProvider = mock<LicenseProvider>();

				licenseState.setLicenseProvider(firstProvider);
				expect(licenseState.licenseProvider).toBe(firstProvider);

				licenseState.setLicenseProvider(secondProvider);
				expect(licenseState.licenseProvider).toBe(secondProvider);
			});

			it('should handle null provider assignment', () => {
				licenseState.setLicenseProvider(mockLicenseProvider);
				expect(licenseState.licenseProvider).toBe(mockLicenseProvider);

				// @ts-expect-error Testing runtime behavior
				licenseState.setLicenseProvider(null);
				expect(licenseState.licenseProvider).toBeNull();
			});
		});

		describe('Provider validation', () => {
			it('should throw ProviderNotSetError when provider is not set for isLicensed', () => {
				expect(() => {
					licenseState.isLicensed('feat:sharing');
				}).toThrow('Cannot query license state because license provider has not been set');
			});

			it('should throw ProviderNotSetError when provider is not set for getValue', () => {
				expect(() => {
					licenseState.getValue('quota:users');
				}).toThrow('Cannot query license state because license provider has not been set');
			});

			it('should not throw when provider is properly set', () => {
				licenseState.setLicenseProvider(mockLicenseProvider);
				mockLicenseProvider.isLicensed.mockReturnValue(true);

				expect(() => {
					licenseState.isLicensed('feat:sharing');
				}).not.toThrow();
			});
		});
	});

	describe('Core License Queries', () => {
		beforeEach(() => {
			licenseState.setLicenseProvider(mockLicenseProvider);
		});

		describe('isLicensed', () => {
			it('should delegate to license provider for boolean features', () => {
				const feature: BooleanLicenseFeature = 'feat:sharing';
				mockLicenseProvider.isLicensed.mockReturnValue(true);

				const result = licenseState.isLicensed(feature);

				expect(mockLicenseProvider.isLicensed).toHaveBeenCalledWith(feature);
				expect(result).toBe(true);
			});

			it('should return false when provider returns false', () => {
				mockLicenseProvider.isLicensed.mockReturnValue(false);

				const result = licenseState.isLicensed('feat:ldap');

				expect(result).toBe(false);
			});

			it('should handle multiple sequential calls correctly', () => {
				mockLicenseProvider.isLicensed
					.mockReturnValueOnce(true)
					.mockReturnValueOnce(false)
					.mockReturnValueOnce(true);

				expect(licenseState.isLicensed('feat:sharing')).toBe(true);
				expect(licenseState.isLicensed('feat:ldap')).toBe(false);
				expect(licenseState.isLicensed('feat:saml')).toBe(true);
			});
		});

		describe('getValue', () => {
			it('should delegate to license provider for feature values', () => {
				const expectedValue = 100;
				mockLicenseProvider.getValue.mockReturnValue(expectedValue);

				const result = licenseState.getValue('quota:users');

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith('quota:users');
				expect(result).toBe(expectedValue);
			});

			it('should handle string values', () => {
				const expectedValue = 'enterprise';
				mockLicenseProvider.getValue.mockReturnValue(expectedValue);

				const result = licenseState.getValue('planName');

				expect(result).toBe(expectedValue);
			});

			it('should handle undefined values', () => {
				mockLicenseProvider.getValue.mockReturnValue(undefined);

				const result = licenseState.getValue('quota:activeWorkflows');

				expect(result).toBeUndefined();
			});
		});
	});

	describe('Boolean License Feature Methods', () => {
		beforeEach(() => {
			licenseState.setLicenseProvider(mockLicenseProvider);
		});

		const booleanMethods = [
			{ method: 'isSharingLicensed', feature: 'feat:sharing' },
			{ method: 'isLogStreamingLicensed', feature: 'feat:logStreaming' },
			{ method: 'isLdapLicensed', feature: 'feat:ldap' },
			{ method: 'isSamlLicensed', feature: 'feat:saml' },
			{ method: 'isOidcLicensed', feature: 'feat:oidc' },
			{ method: 'isMFAEnforcementLicensed', feature: 'feat:mfaEnforcement' },
			{ method: 'isApiKeyScopesLicensed', feature: 'feat:apiKeyScopes' },
			{ method: 'isAiAssistantLicensed', feature: 'feat:aiAssistant' },
			{ method: 'isAskAiLicensed', feature: 'feat:askAi' },
			{ method: 'isAiCreditsLicensed', feature: 'feat:aiCredits' },
			{ method: 'isAdvancedExecutionFiltersLicensed', feature: 'feat:advancedExecutionFilters' },
			{ method: 'isAdvancedPermissionsLicensed', feature: 'feat:advancedPermissions' },
			{ method: 'isDebugInEditorLicensed', feature: 'feat:debugInEditor' },
			{ method: 'isBinaryDataS3Licensed', feature: 'feat:binaryDataS3' },
			{ method: 'isMultiMainLicensed', feature: 'feat:multipleMainInstances' },
			{ method: 'isVariablesLicensed', feature: 'feat:variables' },
			{ method: 'isSourceControlLicensed', feature: 'feat:sourceControl' },
			{ method: 'isExternalSecretsLicensed', feature: 'feat:externalSecrets' },
			{ method: 'isWorkflowHistoryLicensed', feature: 'feat:workflowHistory' },
			{ method: 'isAPIDisabled', feature: 'feat:apiDisabled' },
			{ method: 'isWorkerViewLicensed', feature: 'feat:workerView' },
			{ method: 'isProjectRoleAdminLicensed', feature: 'feat:projectRole:admin' },
			{ method: 'isProjectRoleEditorLicensed', feature: 'feat:projectRole:editor' },
			{ method: 'isProjectRoleViewerLicensed', feature: 'feat:projectRole:viewer' },
			{ method: 'isCustomNpmRegistryLicensed', feature: 'feat:communityNodes:customRegistry' },
			{ method: 'isFoldersLicensed', feature: 'feat:folders' },
			{ method: 'isInsightsSummaryLicensed', feature: 'feat:insights:viewSummary' },
			{ method: 'isInsightsDashboardLicensed', feature: 'feat:insights:viewDashboard' },
			{ method: 'isInsightsHourlyDataLicensed', feature: 'feat:insights:viewHourlyData' },
		] as const;

		booleanMethods.forEach(({ method, feature }) => {
			describe(method, () => {
				it(`should call isLicensed with ${feature} and return true when licensed`, () => {
					mockLicenseProvider.isLicensed.mockReturnValue(true);

					const result = (licenseState as any)[method]();

					expect(mockLicenseProvider.isLicensed).toHaveBeenCalledWith(feature);
					expect(result).toBe(true);
				});

				it(`should call isLicensed with ${feature} and return false when not licensed`, () => {
					mockLicenseProvider.isLicensed.mockReturnValue(false);

					const result = (licenseState as any)[method]();

					expect(mockLicenseProvider.isLicensed).toHaveBeenCalledWith(feature);
					expect(result).toBe(false);
				});
			});
		});

		it('should handle all boolean methods consistently', () => {
			// Test that all methods follow the same pattern
			mockLicenseProvider.isLicensed.mockReturnValue(true);

			booleanMethods.forEach(({ method }) => {
				const result = (licenseState as any)[method]();
				expect(typeof result).toBe('boolean');
				expect(result).toBe(true);
			});

			expect(mockLicenseProvider.isLicensed).toHaveBeenCalledTimes(booleanMethods.length);
		});
	});

	describe('Quota/Value License Feature Methods', () => {
		beforeEach(() => {
			licenseState.setLicenseProvider(mockLicenseProvider);
		});

		describe('getMaxUsers', () => {
			it('should return provider value when available', () => {
				mockLicenseProvider.getValue.mockReturnValue(50);

				const result = licenseState.getMaxUsers();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith('quota:users');
				expect(result).toBe(50);
			});

			it('should return UNLIMITED_LICENSE_QUOTA when provider returns null', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getMaxUsers();

				expect(result).toBe(UNLIMITED_LICENSE_QUOTA);
			});

			it('should return UNLIMITED_LICENSE_QUOTA when provider returns undefined', () => {
				mockLicenseProvider.getValue.mockReturnValue(undefined);

				const result = licenseState.getMaxUsers();

				expect(result).toBe(UNLIMITED_LICENSE_QUOTA);
			});
		});

		describe('getMaxActiveWorkflows', () => {
			it('should return provider value when available', () => {
				mockLicenseProvider.getValue.mockReturnValue(100);

				const result = licenseState.getMaxActiveWorkflows();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith('quota:activeWorkflows');
				expect(result).toBe(100);
			});

			it('should return UNLIMITED_LICENSE_QUOTA when provider returns null', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getMaxActiveWorkflows();

				expect(result).toBe(UNLIMITED_LICENSE_QUOTA);
			});
		});

		describe('getMaxVariables', () => {
			it('should return provider value when available', () => {
				mockLicenseProvider.getValue.mockReturnValue(200);

				const result = licenseState.getMaxVariables();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith('quota:maxVariables');
				expect(result).toBe(200);
			});

			it('should return UNLIMITED_LICENSE_QUOTA when provider returns null', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getMaxVariables();

				expect(result).toBe(UNLIMITED_LICENSE_QUOTA);
			});
		});

		describe('getMaxAiCredits', () => {
			it('should return provider value when available', () => {
				mockLicenseProvider.getValue.mockReturnValue(1000);

				const result = licenseState.getMaxAiCredits();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith('quota:aiCredits');
				expect(result).toBe(1000);
			});

			it('should return 0 when provider returns null (different default)', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getMaxAiCredits();

				expect(result).toBe(0);
			});

			it('should return 0 when provider returns undefined', () => {
				mockLicenseProvider.getValue.mockReturnValue(undefined);

				const result = licenseState.getMaxAiCredits();

				expect(result).toBe(0);
			});
		});

		describe('getWorkflowHistoryPruneQuota', () => {
			it('should return provider value when available', () => {
				mockLicenseProvider.getValue.mockReturnValue(500);

				const result = licenseState.getWorkflowHistoryPruneQuota();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith('quota:workflowHistoryPrune');
				expect(result).toBe(500);
			});

			it('should return UNLIMITED_LICENSE_QUOTA when provider returns null', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getWorkflowHistoryPruneQuota();

				expect(result).toBe(UNLIMITED_LICENSE_QUOTA);
			});
		});

		describe('Insights Quota Methods', () => {
			it('should handle getInsightsMaxHistory with default value 7', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getInsightsMaxHistory();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith('quota:insights:maxHistoryDays');
				expect(result).toBe(7);
			});

			it('should handle getInsightsRetentionMaxAge with default value 180', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getInsightsRetentionMaxAge();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith(
					'quota:insights:retention:maxAgeDays',
				);
				expect(result).toBe(180);
			});

			it('should handle getInsightsRetentionPruneInterval with default value 24', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getInsightsRetentionPruneInterval();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith(
					'quota:insights:retention:pruneIntervalDays',
				);
				expect(result).toBe(24);
			});

			it('should return custom values when provider provides them', () => {
				mockLicenseProvider.getValue
					.mockReturnValueOnce(14) // maxHistoryDays
					.mockReturnValueOnce(365) // maxAgeDays
					.mockReturnValueOnce(48); // pruneIntervalDays

				expect(licenseState.getInsightsMaxHistory()).toBe(14);
				expect(licenseState.getInsightsRetentionMaxAge()).toBe(365);
				expect(licenseState.getInsightsRetentionPruneInterval()).toBe(48);
			});
		});

		describe('Team and Project Quotas', () => {
			it('should handle getMaxTeamProjects with default value 0', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getMaxTeamProjects();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith('quota:maxTeamProjects');
				expect(result).toBe(0);
			});

			it('should handle getMaxWorkflowsWithEvaluations with default value 0', () => {
				mockLicenseProvider.getValue.mockReturnValue(null as any);

				const result = licenseState.getMaxWorkflowsWithEvaluations();

				expect(mockLicenseProvider.getValue).toHaveBeenCalledWith('quota:evaluations:maxWorkflows');
				expect(result).toBe(0);
			});

			it('should return custom values when provider provides them', () => {
				mockLicenseProvider.getValue
					.mockReturnValueOnce(10) // maxTeamProjects
					.mockReturnValueOnce(50); // maxWorkflowsWithEvaluations

				expect(licenseState.getMaxTeamProjects()).toBe(10);
				expect(licenseState.getMaxWorkflowsWithEvaluations()).toBe(50);
			});
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle provider throwing errors in isLicensed', () => {
			licenseState.setLicenseProvider(mockLicenseProvider);
			mockLicenseProvider.isLicensed.mockImplementation(() => {
				throw new Error('Provider error');
			});

			expect(() => {
				licenseState.isLicensed('feat:sharing');
			}).toThrow('Provider error');
		});

		it('should handle provider throwing errors in getValue', () => {
			licenseState.setLicenseProvider(mockLicenseProvider);
			mockLicenseProvider.getValue.mockImplementation(() => {
				throw new Error('Provider error');
			});

			expect(() => {
				licenseState.getValue('quota:users');
			}).toThrow('Provider error');
		});

		it('should handle provider returning unexpected types', () => {
			licenseState.setLicenseProvider(mockLicenseProvider);

			// @ts-expect-error Testing runtime behavior with invalid return types
			mockLicenseProvider.isLicensed.mockReturnValue('not a boolean');

			const result = licenseState.isLicensed('feat:sharing');
			expect(result).toBe('not a boolean');
		});

		it('should handle rapid sequential calls', () => {
			licenseState.setLicenseProvider(mockLicenseProvider);
			mockLicenseProvider.isLicensed.mockReturnValue(true);
			mockLicenseProvider.getValue.mockReturnValue(100);

			// Make many rapid calls
			const promises = Array.from({ length: 100 }, (_, i) => {
				if (i % 2 === 0) {
					return Promise.resolve(licenseState.isLicensed('feat:sharing'));
				} else {
					return Promise.resolve(licenseState.getValue('quota:users'));
				}
			});

			return Promise.all(promises).then((results) => {
				expect(results).toHaveLength(100);
				expect(mockLicenseProvider.isLicensed).toHaveBeenCalledTimes(50);
				expect(mockLicenseProvider.getValue).toHaveBeenCalledTimes(50);
			});
		});
	});

	describe('Integration with Dependency Injection', () => {
		it('should work correctly when created via Container', () => {
			const containerInstance = Container.get(LicenseState);
			const mockProvider = mock<LicenseProvider>();

			expect(containerInstance).toBeInstanceOf(LicenseState);
			expect(containerInstance.licenseProvider).toBeNull();

			containerInstance.setLicenseProvider(mockProvider);
			expect(containerInstance.licenseProvider).toBe(mockProvider);
		});

		it('should maintain singleton behavior via Container', () => {
			const instance1 = Container.get(LicenseState);
			const instance2 = Container.get(LicenseState);

			expect(instance1).toBe(instance2);
		});

		it('should reset properly when Container is reset', () => {
			const instance1 = Container.get(LicenseState);
			instance1.setLicenseProvider(mockLicenseProvider);

			Container.reset();

			const instance2 = Container.get(LicenseState);
			expect(instance2).not.toBe(instance1);
			expect(instance2.licenseProvider).toBeNull();
		});
	});

	describe('Type Safety and API Consistency', () => {
		beforeEach(() => {
			licenseState.setLicenseProvider(mockLicenseProvider);
		});

		it('should maintain consistent return types for all boolean methods', () => {
			mockLicenseProvider.isLicensed.mockReturnValue(true);

			const booleanResults = [
				licenseState.isSharingLicensed(),
				licenseState.isLdapLicensed(),
				licenseState.isSamlLicensed(),
				licenseState.isVariablesLicensed(),
				licenseState.isAPIDisabled(),
			];

			booleanResults.forEach((result) => {
				expect(typeof result).toBe('boolean');
			});
		});

		it('should maintain consistent return types for all quota methods', () => {
			mockLicenseProvider.getValue.mockReturnValue(100);

			const quotaResults = [
				licenseState.getMaxUsers(),
				licenseState.getMaxActiveWorkflows(),
				licenseState.getMaxVariables(),
				licenseState.getMaxAiCredits(),
				licenseState.getMaxTeamProjects(),
			];

			quotaResults.forEach((result) => {
				expect(typeof result).toBe('number');
			});
		});

		it('should handle feature flag validation', () => {
			// Test that the methods accept correct feature flags
			const validFeatures: BooleanLicenseFeature[] = [
				'feat:sharing',
				'feat:ldap',
				'feat:saml',
				'feat:variables',
			];

			mockLicenseProvider.isLicensed.mockReturnValue(true);

			validFeatures.forEach((feature) => {
				expect(() => {
					licenseState.isLicensed(feature);
				}).not.toThrow();
			});
		});
	});
});
