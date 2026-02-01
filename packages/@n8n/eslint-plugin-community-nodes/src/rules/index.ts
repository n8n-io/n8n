import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { CredentialDocumentationUrlRule } from './credential-documentation-url.js';
import { CredentialPasswordFieldRule } from './credential-password-field.js';
import { CredentialTestRequiredRule } from './credential-test-required.js';
import { IconValidationRule } from './icon-validation.js';
import { NoCredentialReuseRule } from './no-credential-reuse.js';
import { NoDeprecatedWorkflowFunctionsRule } from './no-deprecated-workflow-functions.js';
import { NoRestrictedGlobalsRule } from './no-restricted-globals.js';
import { NoRestrictedImportsRule } from './no-restricted-imports.js';
import { NodeUsableAsToolRule } from './node-usable-as-tool.js';
import { PackageNameConventionRule } from './package-name-convention.js';
import { ResourceOperationPatternRule } from './resource-operation-pattern.js';

export const rules = {
	'no-restricted-globals': NoRestrictedGlobalsRule,
	'no-restricted-imports': NoRestrictedImportsRule,
	'credential-password-field': CredentialPasswordFieldRule,
	'no-deprecated-workflow-functions': NoDeprecatedWorkflowFunctionsRule,
	'node-usable-as-tool': NodeUsableAsToolRule,
	'package-name-convention': PackageNameConventionRule,
	'credential-test-required': CredentialTestRequiredRule,
	'no-credential-reuse': NoCredentialReuseRule,
	'icon-validation': IconValidationRule,
	'resource-operation-pattern': ResourceOperationPatternRule,
	'credential-documentation-url': CredentialDocumentationUrlRule,
} satisfies Record<string, AnyRuleModule>;
