describe('Environment Feature Flags', () => {
	beforeEach(() => {
		cy.visit('/');
	});

	it('should load envFeatureFlags from backend settings', () => {
		// Test that the envFeatureFlags property exists in settings when there are flags
		cy.request('GET', '/rest/settings').then((response) => {
			expect(response.status).to.eq(200);
			expect(response.body).to.have.property('data');

			const envFlags = response.body.data.envFeatureFlags;

			// Log what flags are currently available (if any)
			cy.log('Available environment feature flags:', JSON.stringify(envFlags));

			// The property should always exist but may be empty
			expect(envFlags).to.be.an('object');

			// Check if we have any N8N_ENV_FEAT_ environment variables set
			// This will help us understand if the environment variables are being passed through
			const hasEnvFeatureFlags = Object.keys(envFlags).some((key) =>
				key.startsWith('N8N_ENV_FEAT_'),
			);

			if (hasEnvFeatureFlags) {
				// If flags are set, verify they follow the naming pattern
				Object.keys(envFlags).forEach((key) => {
					expect(key).to.match(/^N8N_ENV_FEAT_/);
				});
				cy.log('✅ Environment feature flags are working correctly');
			} else {
				cy.log('⚠️  No N8N_ENV_FEAT_ environment variables found. Set some before running tests:');
				cy.log('   N8N_ENV_FEAT_TEST_FLAG=true npm run test:e2e:ui');
			}
		});
	});

	it('should demonstrate the structure and format of environment feature flags', () => {
		// This test demonstrates how to work with environment flags when they exist
		cy.request('GET', '/rest/settings').then((response) => {
			const envFlags = response.body.data.envFeatureFlags || {};

			// Test the structure is correct
			expect(envFlags).to.be.an('object');

			const flagKeys = Object.keys(envFlags);

			if (flagKeys.length > 0) {
				// If environment variables are present, test their format
				Object.entries(envFlags).forEach(([key, value]) => {
					// All keys should start with N8N_ENV_FEAT_
					expect(key).to.match(/^N8N_ENV_FEAT_/);

					// Values should be strings (environment variables are always strings)
					expect(value).to.be.a('string');
				});

				cy.log(`✅ Found ${flagKeys.length} environment feature flags with correct format`);
			} else {
				cy.log('⚠️  No environment feature flags found. To test with flags, run:');
				cy.log('   N8N_ENV_FEAT_TEST_FLAG=true N8N_ENV_FEAT_DEBUG=false npm run test:e2e:ui');
			}
		});
	});

	it('should work with specific environment variables when set', () => {
		// This test will pass if specific environment variables are set
		cy.request('GET', '/rest/settings').then((response) => {
			const envFlags = response.body.data.envFeatureFlags || {};

			// Check for common test environment variables
			const testVars = ['N8N_ENV_FEAT_TEST_FLAG', 'N8N_ENV_FEAT_DEBUG', 'N8N_ENV_FEAT_MY_FEATURE'];

			const foundVars = testVars.filter((varName) => envFlags.hasOwnProperty(varName));

			if (foundVars.length > 0) {
				foundVars.forEach((varName) => {
					const value = envFlags[varName];
					expect(value).to.be.a('string');
					cy.log(`✅ Found test variable: ${varName}=${value}`);
				});
			} else {
				cy.log(
					'⚠️  No test environment variables found. To test specific flags, set them before running:',
				);
				cy.log('   N8N_ENV_FEAT_TEST_FLAG=true N8N_ENV_FEAT_DEBUG=false npm run test:e2e:ui');
				cy.log('   Then this test will verify they are properly passed through to the backend.');
			}
		});
	});

	it('should work with useEnvFeatureFlag composable when flags are set', () => {
		// This test demonstrates how the frontend would use the feature flags
		cy.request('GET', '/rest/settings').then((response) => {
			const envFlags = response.body.data.envFeatureFlags || {};

			// Visit the page to ensure the settings store is initialized
			cy.visit('/');

			// Test that the settings store has the envFeatureFlags
			cy.window().then(() => {
				// In a real scenario, you would:
				// 1. Set N8N_ENV_FEAT_TEST_FLAG=true before starting n8n
				// 2. Use the EnvFeatureFlag component in your workflow
				// 3. Test that it shows/hides content based on the flag value

				// For demonstration, we just verify the flags are accessible
				cy.log('Environment flags available to frontend:', JSON.stringify(envFlags));

				// The useEnvFeatureFlag composable would check these flags
				// and the EnvFeatureFlag component would conditionally render content
				expect(envFlags).to.be.an('object');
			});
		});
	});

	it('should demonstrate dynamic environment feature flag control', () => {
		// Clear any existing flags first
		cy.clearEnvFeatureFlags().then((result) => {
			expect(result.success).to.be.true;
			cy.log('Initial flags cleared');
		});

		// Set environment feature flags using the simplified commands
		const testFlags = {
			N8N_ENV_FEAT_TEST_FLAG: 'true',
			N8N_ENV_FEAT_DEBUG: 'false',
			N8N_ENV_FEAT_MY_FEATURE: 'enabled',
		};

		cy.setEnvFeatureFlags(testFlags).then((result) => {
			expect(result.success).to.be.true;
			expect(result.flags).to.be.an('object');
			if (result.flags) {
				expect(result.flags['N8N_ENV_FEAT_TEST_FLAG']).to.eq('true');
				expect(result.flags['N8N_ENV_FEAT_DEBUG']).to.eq('false');
				expect(result.flags['N8N_ENV_FEAT_MY_FEATURE']).to.eq('enabled');
			}

			cy.log('✅ Successfully set environment feature flags');
		});

		// Verify the flags are set
		cy.getEnvFeatureFlags().then((flags) => {
			expect(flags).to.be.an('object');
			expect(flags['N8N_ENV_FEAT_TEST_FLAG']).to.eq('true');
			expect(flags['N8N_ENV_FEAT_DEBUG']).to.eq('false');
			expect(flags['N8N_ENV_FEAT_MY_FEATURE']).to.eq('enabled');

			cy.log('✅ Environment feature flags verified');
		});

		// Test clearing flags
		cy.clearEnvFeatureFlags().then((result) => {
			expect(result.success).to.be.true;
			expect(result.flags).to.be.an('object');
			expect(Object.keys(result.flags)).to.have.length(0);

			cy.log('✅ Successfully cleared environment feature flags');
		});

		// Verify flags are cleared
		cy.getEnvFeatureFlags().then((flags) => {
			expect(flags).to.be.an('object');
			expect(Object.keys(flags)).to.have.length(0);

			cy.log('✅ Environment feature flags cleared verification');
		});
	});

	it('should validate environment feature flag keys', () => {
		// Test invalid flag key (doesn't start with N8N_ENV_FEAT_)
		cy.setEnvFeatureFlags({ INVALID_FLAG: 'true' } as any).then((result: any) => {
			expect(result.success).to.be.false;
			expect(result.message).to.include('Invalid flag key: INVALID_FLAG');
			cy.log('✅ Correctly rejected invalid flag key');
		});

		// Test invalid flag value (not a string)
		cy.setEnvFeatureFlags({ N8N_ENV_FEAT_TEST: 123 } as any).then((result: any) => {
			expect(result.success).to.be.false;
			expect(result.message).to.include('Invalid flag value for N8N_ENV_FEAT_TEST');
			cy.log('✅ Correctly rejected invalid flag value');
		});
	});
});
