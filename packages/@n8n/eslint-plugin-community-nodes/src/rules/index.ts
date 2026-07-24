import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { AiNodePackageJsonRule } from './ai-node-package-json.js';
import { CredClassFieldIconMissingRule } from './cred-class-field-icon-missing.js';
import { CredClassOAuth2NamingRule } from './cred-class-oauth2-naming.js';
import { CredentialDocumentationUrlRule } from './credential-documentation-url.js';
import { CredentialPasswordFieldRule } from './credential-password-field.js';
import { CredentialTestRequiredRule } from './credential-test-required.js';
import { IconPreferThemedVariantsRule } from './icon-prefer-themed-variants.js';
import { IconValidationRule } from './icon-validation.js';
import { MissingPairedItemRule } from './missing-paired-item.js';
import { N8nObjectValidationRule } from './n8n-object-validation.js';
import { NoBuilderHintLeakageRule } from './no-builder-hint-leakage.js';
import { NoCredentialReuseRule } from './no-credential-reuse.js';
import { NoDangerousFunctionsRule } from './no-dangerous-functions.js';
import { NoDeprecatedWorkflowFunctionsRule } from './no-deprecated-workflow-functions.js';
import { NoEmojiInOptionsRule } from './no-emoji-in-options.js';
import { NoForbiddenLifecycleScriptsRule } from './no-forbidden-lifecycle-scripts.js';
import { NoHttpRequestWithManualAuthRule } from './no-http-request-with-manual-auth.js';
import { NoOverridesFieldRule } from './no-overrides-field.js';
import { NoRestrictedGlobalsRule } from './no-restricted-globals.js';
import { NoRestrictedImportsRule } from './no-restricted-imports.js';
import { NoRuntimeDependenciesRule } from './no-runtime-dependencies.js';
import { NoTemplatePlaceholdersRule } from './no-template-placeholders.js';
import { NodeClassDescriptionIconMissingRule } from './node-class-description-icon-missing.js';
import { NodeConnectionTypeLiteralRule } from './node-connection-type-literal.js';
import { NodeRegistrationCompleteRule } from './node-registration-complete.js';
import { NodeUsableAsToolRule } from './node-usable-as-tool.js';
import { PackageNameConventionRule } from './package-name-convention.js';
import { RequireNodeApiErrorRule } from './require-node-api-error.js';
import { RequireNodeDescriptionFieldsRule } from './require-node-description-fields.js';
import { RequireVersionRule } from './require-version.js';
import { ResourceOperationPatternRule } from './resource-operation-pattern.js';
import { TriggerNodeConventionsRule } from './trigger-node-conventions.js';
import { ValidAuthorRule } from './valid-author.js';
import { ValidCredentialReferencesRule } from './valid-credential-references.js';
import { ValidDescriptionRule } from './valid-description.js';
import { ValidPeerDependenciesRule } from './valid-peer-dependencies.js';
import { WebhookLifecycleCompleteRule } from './webhook-lifecycle-complete.js';

export const rules = {
	'ai-node-package-json': AiNodePackageJsonRule,
	'no-restricted-globals': NoRestrictedGlobalsRule,
	'no-restricted-imports': NoRestrictedImportsRule,
	'credential-password-field': CredentialPasswordFieldRule,
	'no-deprecated-workflow-functions': NoDeprecatedWorkflowFunctionsRule,
	'no-emoji-in-options': NoEmojiInOptionsRule,
	'node-usable-as-tool': NodeUsableAsToolRule,
	'package-name-convention': PackageNameConventionRule,
	'credential-test-required': CredentialTestRequiredRule,
	'no-credential-reuse': NoCredentialReuseRule,
	'no-dangerous-functions': NoDangerousFunctionsRule,
	'no-forbidden-lifecycle-scripts': NoForbiddenLifecycleScriptsRule,
	'no-http-request-with-manual-auth': NoHttpRequestWithManualAuthRule,
	'no-overrides-field': NoOverridesFieldRule,
	'no-runtime-dependencies': NoRuntimeDependenciesRule,
	'no-template-placeholders': NoTemplatePlaceholdersRule,
	'icon-validation': IconValidationRule,
	'icon-prefer-themed-variants': IconPreferThemedVariantsRule,
	'resource-operation-pattern': ResourceOperationPatternRule,
	'trigger-node-conventions': TriggerNodeConventionsRule,
	'credential-documentation-url': CredentialDocumentationUrlRule,
	'node-class-description-icon-missing': NodeClassDescriptionIconMissingRule,
	'cred-class-field-icon-missing': CredClassFieldIconMissingRule,
	'cred-class-oauth2-naming': CredClassOAuth2NamingRule,
	'node-connection-type-literal': NodeConnectionTypeLiteralRule,
	'node-registration-complete': NodeRegistrationCompleteRule,
	'missing-paired-item': MissingPairedItemRule,
	'no-builder-hint-leakage': NoBuilderHintLeakageRule,
	'n8n-object-validation': N8nObjectValidationRule,
	'require-node-api-error': RequireNodeApiErrorRule,
	'require-node-description-fields': RequireNodeDescriptionFieldsRule,
	'require-version': RequireVersionRule,
	'valid-author': ValidAuthorRule,
	'valid-credential-references': ValidCredentialReferencesRule,
	'valid-description': ValidDescriptionRule,
	'valid-peer-dependencies': ValidPeerDependenciesRule,
	'webhook-lifecycle-complete': WebhookLifecycleCompleteRule,
} satisfies Record<string, AnyRuleModule>;
