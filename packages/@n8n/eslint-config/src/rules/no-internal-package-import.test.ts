import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoInternalPackageImportRule } from './no-internal-package-import.js';

const ruleTester = new RuleTester();

ruleTester.run('no-internal-package-import', NoInternalPackageImportRule, {
	valid: [
		{ code: 'import { SomeDto } from "@n8n/api-types"' },
		{ code: 'import { Logger } from "@n8n/backend-common"' },
		{ code: 'import { NodeHelpers } from "@n8n/workflow"' },
		{ code: 'import lodash from "lodash"' },
		{ code: 'import { helper } from "./local-file"' },
		{ code: 'import { utils } from "../utils"' },
		{ code: 'import express from "express"' },
		{ code: 'import { something } from "@other-org/package/src/file"' },
	],

	invalid: [
		{
			code: 'import { UpdateDataTableDto } from "@n8n/api-types/src/dto/data-table/update-data-table.dto"',
			output: 'import { UpdateDataTableDto } from "@n8n/api-types"',
			errors: [{ messageId: 'noInternalPackageImport' }],
		},
		{
			code: 'import { helper } from "@n8n/backend-common/src/utils/helper"',
			output: 'import { helper } from "@n8n/backend-common"',
			errors: [{ messageId: 'noInternalPackageImport' }],
		},
	],
});
