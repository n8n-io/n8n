import { Struct } from '../common/struct';
import { Operation2xxResponse } from '../common/operation-2xx-response';
import { Operation4xxResponse } from '../common/operation-4xx-response';
import { Assertions } from '../common/assertions';
import { OperationIdUnique } from '../common/operation-operationId-unique';
import { OperationParametersUnique } from '../common/operation-parameters-unique';
import { PathParamsDefined } from '../common/path-params-defined';
import { OperationTagDefined } from '../common/operation-tag-defined';
import { NoExampleValueAndExternalValue } from './no-example-value-and-externalValue';
import { NoEnumTypeMismatch } from '../common/no-enum-type-mismatch';
import { NoPathTrailingSlash } from '../common/no-path-trailing-slash';
import { PathDeclarationMustExist } from '../common/path-declaration-must-exist';
import { OperationIdUrlSafe } from '../common/operation-operationId-url-safe';
import { TagsAlphabetical } from '../common/tags-alphabetical';
import { NoServerExample } from './no-server-example.com';
import { NoServerTrailingSlash } from './no-server-trailing-slash';
import { TagDescription } from '../common/tag-description';
import { InfoContact } from '../common/info-contact';
import { InfoLicense } from '../common/info-license';
import { InfoLicenseUrl } from '../common/info-license-url';
import { InfoLicenseStrict } from '../common/info-license-strict';
import { OperationDescription } from '../common/operation-description';
import { NoUnusedComponents } from './no-unused-components';
import { PathNotIncludeQuery } from '../common/path-not-include-query';
import { ParameterDescription } from '../common/parameter-description';
import { OperationSingularTag } from '../common/operation-singular-tag';
import { SecurityDefined } from '../common/security-defined';
import { NoUnresolvedRefs } from '../no-unresolved-refs';
import { BooleanParameterPrefixes } from './boolean-parameter-prefixes';
import { PathsKebabCase } from '../common/paths-kebab-case';
import { PathHttpVerbsOrder } from '../common/path-http-verbs-order';
import { NoEmptyServers } from './no-empty-servers';
import { ValidContentExamples } from './no-invalid-media-type-examples';
import { NoIdenticalPaths } from '../common/no-identical-paths';
import { NoUndefinedServerVariable } from './no-undefined-server-variable';
import { OperationOperationId } from '../common/operation-operationId';
import { OperationSummary } from '../common/operation-summary';
import { NoAmbiguousPaths } from '../common/no-ambiguous-paths';
import { NoServerVariablesEmptyEnum } from './no-server-variables-empty-enum';
import { NoHttpVerbsInPaths } from '../common/no-http-verbs-in-paths';
import { RequestMimeType } from './request-mime-type';
import { ResponseMimeType } from './response-mime-type';
import { PathSegmentPlural } from '../common/path-segment-plural';
import { PathExcludesPatterns } from '../common/path-excludes-patterns';
import { NoInvalidSchemaExamples } from '../common/no-invalid-schema-examples';
import { NoInvalidParameterExamples } from '../common/no-invalid-parameter-examples';
import { ResponseContainsHeader } from '../common/response-contains-header';
import { ResponseContainsProperty } from './response-contains-property';
import { ScalarPropertyMissingExample } from '../common/scalar-property-missing-example';
import { SpecComponentsInvalidMapName } from './spec-components-invalid-map-name';
import { Operation4xxProblemDetailsRfc7807 } from './operation-4xx-problem-details-rfc7807';
import { RequiredStringPropertyMissingMinLength } from '../common/required-string-property-missing-min-length';
import { SpecStrictRefs } from '../common/spec-strict-refs';
import { ComponentNameUnique } from './component-name-unique';
import { ArrayParameterSerialization } from './array-parameter-serialization';
import { NoRequiredSchemaPropertiesUndefined } from '../common/no-required-schema-properties-undefined';
import { NoSchemaTypeMismatch } from '../common/no-schema-type-mismatch';

import type { Oas3RuleSet } from '../../oas-types';
import type { Oas3Rule } from '../../visitors';

export const rules: Oas3RuleSet<'built-in'> = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore TODO: This is depricated property `spec` and should be removed in the future
  spec: Struct as Oas3Rule,
  struct: Struct as Oas3Rule,
  'info-contact': InfoContact as Oas3Rule,
  'info-license': InfoLicense as Oas3Rule,
  'info-license-url': InfoLicenseUrl as Oas3Rule,
  'info-license-strict': InfoLicenseStrict as Oas3Rule,
  'operation-2xx-response': Operation2xxResponse as Oas3Rule,
  'operation-4xx-response': Operation4xxResponse as Oas3Rule,
  'operation-4xx-problem-details-rfc7807': Operation4xxProblemDetailsRfc7807,
  assertions: Assertions as Oas3Rule,
  'operation-operationId-unique': OperationIdUnique as Oas3Rule,
  'operation-parameters-unique': OperationParametersUnique as Oas3Rule,
  'operation-tag-defined': OperationTagDefined as Oas3Rule,
  'no-example-value-and-externalValue': NoExampleValueAndExternalValue,
  'no-enum-type-mismatch': NoEnumTypeMismatch as Oas3Rule,
  'no-path-trailing-slash': NoPathTrailingSlash as Oas3Rule,
  'no-empty-servers': NoEmptyServers,
  'path-declaration-must-exist': PathDeclarationMustExist as Oas3Rule,
  'operation-operationId-url-safe': OperationIdUrlSafe as Oas3Rule,
  'operation-operationId': OperationOperationId as Oas3Rule,
  'operation-summary': OperationSummary as Oas3Rule,
  'tags-alphabetical': TagsAlphabetical as Oas3Rule,
  'no-server-example.com': NoServerExample,
  'no-server-trailing-slash': NoServerTrailingSlash,
  'tag-description': TagDescription as Oas3Rule,
  'operation-description': OperationDescription as Oas3Rule,
  'no-unused-components': NoUnusedComponents,
  'path-not-include-query': PathNotIncludeQuery as Oas3Rule,
  'path-parameters-defined': PathParamsDefined as Oas3Rule,
  'path-params-defined': PathParamsDefined as Oas3Rule,
  'parameter-description': ParameterDescription as Oas3Rule,
  'operation-singular-tag': OperationSingularTag as Oas3Rule,
  'security-defined': SecurityDefined as Oas3Rule,
  'no-unresolved-refs': NoUnresolvedRefs,
  'paths-kebab-case': PathsKebabCase as Oas3Rule,
  'boolean-parameter-prefixes': BooleanParameterPrefixes,
  'path-http-verbs-order': PathHttpVerbsOrder as Oas3Rule,
  'no-invalid-media-type-examples': ValidContentExamples,
  'no-identical-paths': NoIdenticalPaths as Oas3Rule,
  'no-ambiguous-paths': NoAmbiguousPaths as Oas3Rule,
  'no-undefined-server-variable': NoUndefinedServerVariable,
  'no-server-variables-empty-enum': NoServerVariablesEmptyEnum,
  'no-http-verbs-in-paths': NoHttpVerbsInPaths as Oas3Rule,
  'path-excludes-patterns': PathExcludesPatterns as Oas3Rule,
  'request-mime-type': RequestMimeType,
  'response-mime-type': ResponseMimeType,
  'path-segment-plural': PathSegmentPlural as Oas3Rule,
  'no-invalid-schema-examples': NoInvalidSchemaExamples as Oas3Rule,
  'no-invalid-parameter-examples': NoInvalidParameterExamples,
  'response-contains-header': ResponseContainsHeader as Oas3Rule,
  'response-contains-property': ResponseContainsProperty,
  'scalar-property-missing-example': ScalarPropertyMissingExample as Oas3Rule,
  'spec-components-invalid-map-name': SpecComponentsInvalidMapName,
  'required-string-property-missing-min-length': RequiredStringPropertyMissingMinLength,
  'spec-strict-refs': SpecStrictRefs as Oas3Rule,
  'component-name-unique': ComponentNameUnique as Oas3Rule,
  'array-parameter-serialization': ArrayParameterSerialization,
  'no-required-schema-properties-undefined': NoRequiredSchemaPropertiesUndefined as Oas3Rule,
  'no-schema-type-mismatch': NoSchemaTypeMismatch as Oas3Rule,
};

export const preprocessors = {};
