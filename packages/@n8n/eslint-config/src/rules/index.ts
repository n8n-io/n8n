import { NoJsonParseJsonStringifyRule } from './no-json-parse-json-stringify.js';
import { NoUncaughtJsonParseRule } from './no-uncaught-json-parse.js';
import { NoUnneededBackticksRule } from './no-unneeded-backticks.js';
import { NoUnusedParamInCatchClauseRule } from './no-unused-param-catch-clause.js';
import { NoUselessCatchThrowRule } from './no-useless-catch-throw.js';
import { NoSkippedTestsRule } from './no-skipped-tests.js';
import { NoInterpolationInRegularStringRule } from './no-interpolation-in-regular-string.js';
import { NoPlainErrorsRule } from './no-plain-errors.js';
import { NoDynamicImportTemplateRule } from './no-dynamic-import-template.js';
import { MisplacedN8nTypeormImportRule } from './misplaced-n8n-typeorm-import.js';
import { NoGuardrailDisableRule } from './no-guardrail-disable.js';
import { NoTypeUnsafeEventEmitterRule } from './no-type-unsafe-event-emitter.js';
import { NoUntypedConfigClassFieldRule } from './no-untyped-config-class-field.js';
import { NoTopLevelRelativeImportsInBackendModuleRule } from './no-top-level-relative-imports-in-backend-module.js';
import { NoConstructorInBackendModuleRule } from './no-constructor-in-backend-module.js';
import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';
import { NoArgumentSpreadRule } from './no-argument-spread.js';
import { NoInternalPackageImportRule } from './no-internal-package-import.js';
import { NoImportEnterpriseEditionRule } from './no-import-enterprise-edition.js';
import { NoTypeOnlyImportInDiRule } from './no-type-only-import-in-di.js';
import { NoErrorInstanceInToThrowRule } from './no-error-instance-in-to-throw.js';
import { NoAwsCredentialDiscoveryImportsRule } from './no-aws-credential-discovery-imports.js';
import { NoUncentralizedHttpRule } from './no-uncentralized-http.js';
import { NoApplicationErrorRule } from './no-application-error.js';
import { NoDynamicRegExpRule } from './no-dynamic-regexp.js';
import { ProjectOwnedEntityTransferRule } from './project-owned-entity-transfer.js';
import { NoRekaUiPaginationRule } from './no-reka-ui-pagination.js';
import { NoRestrictedSleepDefinitionRule } from './no-restricted-sleep-definition.js';
import { NoRestrictedSleepImportRule } from './no-restricted-sleep-import.js';
import { NoRepositoryInPublicApiHandlerRule } from './no-repository-in-public-api-handler.js';
import { RequirePublicApiControllerRule } from './require-public-api-controller.js';
import { NoLegacyCipherMethodsRule } from './no-legacy-cipher-methods.js';
import { NoUnsealedWorkflowEntityWriteRule } from './no-unsealed-workflow-entity-write.js';
import { NoOnLeaderTakeoverRule } from './no-on-leader-takeover.js';
import { NoMisplacedCipherPrimitivesRule } from './no-misplaced-cipher-primitives.js';
import { NoDeploymentKeyDeleteRule } from './no-deployment-key-delete.js';
import { NoEncryptionGuardrailDisableRule } from './no-encryption-guardrail-disable.js';

export const rules = {
	'no-uncaught-json-parse': NoUncaughtJsonParseRule,
	'no-json-parse-json-stringify': NoJsonParseJsonStringifyRule,
	'no-unneeded-backticks': NoUnneededBackticksRule,
	'no-unused-param-in-catch-clause': NoUnusedParamInCatchClauseRule,
	'no-useless-catch-throw': NoUselessCatchThrowRule,
	'no-skipped-tests': NoSkippedTestsRule,
	'no-interpolation-in-regular-string': NoInterpolationInRegularStringRule,
	'no-plain-errors': NoPlainErrorsRule,
	'no-dynamic-import-template': NoDynamicImportTemplateRule,
	'misplaced-n8n-typeorm-import': MisplacedN8nTypeormImportRule,
	'no-guardrail-disable': NoGuardrailDisableRule,
	'no-type-unsafe-event-emitter': NoTypeUnsafeEventEmitterRule,
	'no-untyped-config-class-field': NoUntypedConfigClassFieldRule,
	'no-top-level-relative-imports-in-backend-module': NoTopLevelRelativeImportsInBackendModuleRule,
	'no-constructor-in-backend-module': NoConstructorInBackendModuleRule,
	'no-argument-spread': NoArgumentSpreadRule,
	'no-internal-package-import': NoInternalPackageImportRule,
	'no-import-enterprise-edition': NoImportEnterpriseEditionRule,
	'no-type-only-import-in-di': NoTypeOnlyImportInDiRule,
	'no-error-instance-in-to-throw': NoErrorInstanceInToThrowRule,
	'no-aws-credential-discovery-imports': NoAwsCredentialDiscoveryImportsRule,
	'no-uncentralized-http': NoUncentralizedHttpRule,
	'no-application-error': NoApplicationErrorRule,
	'no-dynamic-regexp': NoDynamicRegExpRule,
	'project-owned-entity-transfer': ProjectOwnedEntityTransferRule,
	'no-reka-ui-pagination': NoRekaUiPaginationRule,
	'no-restricted-sleep-definition': NoRestrictedSleepDefinitionRule,
	'no-restricted-sleep-import': NoRestrictedSleepImportRule,
	'no-repository-in-public-api-handler': NoRepositoryInPublicApiHandlerRule,
	'require-public-api-controller': RequirePublicApiControllerRule,
	'no-legacy-cipher-methods': NoLegacyCipherMethodsRule,
	'no-unsealed-workflow-entity-write': NoUnsealedWorkflowEntityWriteRule,
	'no-on-leader-takeover': NoOnLeaderTakeoverRule,
	'no-misplaced-cipher-primitives': NoMisplacedCipherPrimitivesRule,
	'no-deployment-key-delete': NoDeploymentKeyDeleteRule,
	'no-encryption-guardrail-disable': NoEncryptionGuardrailDisableRule,
} satisfies Record<string, AnyRuleModule>;
