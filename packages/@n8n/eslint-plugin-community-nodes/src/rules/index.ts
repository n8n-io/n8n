import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { AiNodePackageJsonRule } from './ai-node-package-json.js';
import { CredClassFieldIconMissingRule } from './cred-class-field-icon-missing.js';
import { CredentialDocumentationUrlRule } from './credential-documentation-url.js';
import { CredentialPasswordFieldRule } from './credential-password-field.js';
import { CredentialTestRequiredRule } from './credential-test-required.js';
import { IconValidationRule } from './icon-validation.js';
import { MissingPairedItemRule } from './missing-paired-item.js';
import { NoCredentialReuseRule } from './no-credential-reuse.js';
import { NoDeprecatedWorkflowFunctionsRule } from './no-deprecated-workflow-functions.js';
import { NoForbiddenLifecycleScriptsRule } from './no-forbidden-lifecycle-scripts.js';
import { NoHttpRequestWithManualAuthRule } from './no-http-request-with-manual-auth.js';
import { NoOverridesFieldRule } from './no-overrides-field.js';
import { NoRestrictedGlobalsRule } from './no-restricted-globals.js';
import { NoRestrictedImportsRule } from './no-restricted-imports.js';
import { NodeClassDescriptionIconMissingRule } from './node-class-description-icon-missing.js';
import { NodeConnectionTypeLiteralRule } from './node-connection-type-literal.js';
import { NodeUsableAsToolRule } from './node-usable-as-tool.js';
import { OptionsSortedAlphabeticallyRule } from './options-sorted-alphabetically.js';
import { PackageNameConventionRule } from './package-name-convention.js';
import { RequireCommunityNodeKeywordRule } from './require-community-node-keyword.js';
import { RequireContinueOnFailRule } from './require-continue-on-fail.js';
import { RequireNodeApiErrorRule } from './require-node-api-error.js';
import { RequireNodeDescriptionFieldsRule } from './require-node-description-fields.js';
import { ResourceOperationPatternRule } from './resource-operation-pattern.js';
import { ValidPeerDependenciesRule } from './valid-peer-dependencies.js';
import { WebhookLifecycleCompleteRule } from './webhook-lifecycle-complete.js';

export const rules = {
	'ai-node-package-json': AiNodePackageJsonRule,
	'no-restricted-globals': NoRestrictedGlobalsRule,
	'no-restricted-imports': NoRestrictedImportsRule,
	'credential-password-field': CredentialPasswordFieldRule,
	'no-deprecated-workflow-functions': NoDeprecatedWorkflowFunctionsRule,
	'node-usable-as-tool': NodeUsableAsToolRule,
	'options-sorted-alphabetically': OptionsSortedAlphabeticallyRule,
	'package-name-convention': PackageNameConventionRule,
	'credential-test-required': CredentialTestRequiredRule,
	'no-credential-reuse': NoCredentialReuseRule,
	'no-forbidden-lifecycle-scripts': NoForbiddenLifecycleScriptsRule,
	'no-http-request-with-manual-auth': NoHttpRequestWithManualAuthRule,
	'no-overrides-field': NoOverridesFieldRule,
	'icon-validation': IconValidationRule,
	'resource-operation-pattern': ResourceOperationPatternRule,
	'credential-documentation-url': CredentialDocumentationUrlRule,
	'node-class-description-icon-missing': NodeClassDescriptionIconMissingRule,
	'cred-class-field-icon-missing': CredClassFieldIconMissingRule,
	'node-connection-type-literal': NodeConnectionTypeLiteralRule,
	'missing-paired-item': MissingPairedItemRule,
	'require-community-node-keyword': RequireCommunityNodeKeywordRule,
	'require-continue-on-fail': RequireContinueOnFailRule,
	'require-node-api-error': RequireNodeApiErrorRule,
	'require-node-description-fields': RequireNodeDescriptionFieldsRule,
	'valid-peer-dependencies': ValidPeerDependenciesRule,
	'webhook-lifecycle-complete': WebhookLifecycleCompleteRule,
} satisfies Record<string, AnyRuleModule>;
