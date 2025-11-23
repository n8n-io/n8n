import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoImportEnterpriseEditionRule } from './no-import-enterprise-edition.js';

const ruleTester = new RuleTester();

ruleTester.run('no-import-enterprise-edition', NoImportEnterpriseEditionRule, {
	valid: [
		{
			// Non-enterprise code importing from non-enterprise directories
			code: 'import { SomeService } from "./services/some-service"',
			filename: '/Users/test/project/src/services/regular-service.ts',
		},
		{
			code: 'import { Utils } from "../utils/helper"',
			filename: '/Users/test/project/src/controllers/controller.ts',
		},
		{
			code: 'import { Config } from "@n8n/config"',
			filename: '/Users/test/project/src/services/service.ts',
		},

		// enterprise code importing from ee directories
		{
			code: 'import { EnterpriseService } from "../environments.ee/services/enterprise-service"',
			filename: '/Users/test/project/src/environments.ee/controllers/enterprise-controller.ts',
		},

		// enterprise code importing from non-enterprise directories
		{
			code: 'import { RegularService } from "../services/regular-service"',
			filename: '/Users/test/project/src/environments.ee/controllers/enterprise-controller.ts',
		},
		{
			code: 'import { Config } from "@n8n/config"',
			filename: '/Users/test/project/src/environments.ee/services/service.ts',
		},

		// integration test files can import from .ee directories
		{
			code: 'import { EnterpriseService } from "../environments.ee/services/enterprise-service"',
			filename:
				'/Users/test/project/packages/cli/test/integration/services/enterprise.integration.test.ts',
		},
	],
	invalid: [
		{
			code: 'import { something } from "@n8n/package/environments.ee/file"',
			filename: '/Users/test/project/src/index.ts',
			errors: [{ messageId: 'noImportEnterpriseEdition' }],
		},
		{
			code: `
                import { RegularService } from "./regular-service";
                import { EnterpriseService } from "environments.ee/enterprise-service";
            `,
			filename: '/Users/test/project/src/services/service.ts',
			errors: [{ messageId: 'noImportEnterpriseEdition' }],
		},
	],
});
