"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessors = exports.rules = void 0;
const struct_1 = require("../common/struct");
const no_invalid_schema_examples_1 = require("../common/no-invalid-schema-examples");
const no_invalid_parameter_examples_1 = require("../common/no-invalid-parameter-examples");
const info_contact_1 = require("../common/info-contact");
const info_license_1 = require("../common/info-license");
const info_license_url_1 = require("../common/info-license-url");
const info_license_strict_1 = require("../common/info-license-strict");
const boolean_parameter_prefixes_1 = require("./boolean-parameter-prefixes");
const tag_description_1 = require("../common/tag-description");
const tags_alphabetical_1 = require("../common/tags-alphabetical");
const paths_kebab_case_1 = require("../common/paths-kebab-case");
const no_enum_type_mismatch_1 = require("../common/no-enum-type-mismatch");
const no_path_trailing_slash_1 = require("../common/no-path-trailing-slash");
const operation_2xx_response_1 = require("../common/operation-2xx-response");
const operation_4xx_response_1 = require("../common/operation-4xx-response");
const assertions_1 = require("../common/assertions");
const operation_operationId_unique_1 = require("../common/operation-operationId-unique");
const operation_parameters_unique_1 = require("../common/operation-parameters-unique");
const path_params_defined_1 = require("../common/path-params-defined");
const operation_tag_defined_1 = require("../common/operation-tag-defined");
const path_declaration_must_exist_1 = require("../common/path-declaration-must-exist");
const operation_operationId_url_safe_1 = require("../common/operation-operationId-url-safe");
const operation_description_1 = require("../common/operation-description");
const path_not_include_query_1 = require("../common/path-not-include-query");
const parameter_description_1 = require("../common/parameter-description");
const operation_singular_tag_1 = require("../common/operation-singular-tag");
const security_defined_1 = require("../common/security-defined");
const no_unresolved_refs_1 = require("../no-unresolved-refs");
const path_http_verbs_order_1 = require("../common/path-http-verbs-order");
const no_identical_paths_1 = require("../common/no-identical-paths");
const operation_operationId_1 = require("../common/operation-operationId");
const operation_summary_1 = require("../common/operation-summary");
const no_ambiguous_paths_1 = require("../common/no-ambiguous-paths");
const no_http_verbs_in_paths_1 = require("../common/no-http-verbs-in-paths");
const path_excludes_patterns_1 = require("../common/path-excludes-patterns");
const request_mime_type_1 = require("./request-mime-type");
const response_mime_type_1 = require("./response-mime-type");
const path_segment_plural_1 = require("../common/path-segment-plural");
const response_contains_header_1 = require("../common/response-contains-header");
const response_contains_property_1 = require("./response-contains-property");
const scalar_property_missing_example_1 = require("../common/scalar-property-missing-example");
const required_string_property_missing_min_length_1 = require("../common/required-string-property-missing-min-length");
const spec_strict_refs_1 = require("../common/spec-strict-refs");
const no_required_schema_properties_undefined_1 = require("../common/no-required-schema-properties-undefined");
const no_schema_type_mismatch_1 = require("../common/no-schema-type-mismatch");
exports.rules = {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore TODO: This is depricated property `spec` and should be removed in the future
    spec: struct_1.Struct,
    struct: struct_1.Struct,
    'no-invalid-schema-examples': no_invalid_schema_examples_1.NoInvalidSchemaExamples,
    'no-invalid-parameter-examples': no_invalid_parameter_examples_1.NoInvalidParameterExamples,
    'info-contact': info_contact_1.InfoContact,
    'info-license': info_license_1.InfoLicense,
    'info-license-url': info_license_url_1.InfoLicenseUrl,
    'info-license-strict': info_license_strict_1.InfoLicenseStrict,
    'tag-description': tag_description_1.TagDescription,
    'tags-alphabetical': tags_alphabetical_1.TagsAlphabetical,
    'paths-kebab-case': paths_kebab_case_1.PathsKebabCase,
    'no-enum-type-mismatch': no_enum_type_mismatch_1.NoEnumTypeMismatch,
    'boolean-parameter-prefixes': boolean_parameter_prefixes_1.BooleanParameterPrefixes,
    'no-path-trailing-slash': no_path_trailing_slash_1.NoPathTrailingSlash,
    'operation-2xx-response': operation_2xx_response_1.Operation2xxResponse,
    'operation-4xx-response': operation_4xx_response_1.Operation4xxResponse,
    assertions: assertions_1.Assertions,
    'operation-operationId-unique': operation_operationId_unique_1.OperationIdUnique,
    'operation-parameters-unique': operation_parameters_unique_1.OperationParametersUnique,
    'path-parameters-defined': path_params_defined_1.PathParamsDefined,
    'operation-tag-defined': operation_tag_defined_1.OperationTagDefined,
    'path-declaration-must-exist': path_declaration_must_exist_1.PathDeclarationMustExist,
    'operation-operationId-url-safe': operation_operationId_url_safe_1.OperationIdUrlSafe,
    'operation-operationId': operation_operationId_1.OperationOperationId,
    'operation-summary': operation_summary_1.OperationSummary,
    'operation-description': operation_description_1.OperationDescription,
    'path-not-include-query': path_not_include_query_1.PathNotIncludeQuery,
    'path-params-defined': path_params_defined_1.PathParamsDefined,
    'parameter-description': parameter_description_1.ParameterDescription,
    'operation-singular-tag': operation_singular_tag_1.OperationSingularTag,
    'security-defined': security_defined_1.SecurityDefined,
    'no-unresolved-refs': no_unresolved_refs_1.NoUnresolvedRefs,
    'no-identical-paths': no_identical_paths_1.NoIdenticalPaths,
    'no-ambiguous-paths': no_ambiguous_paths_1.NoAmbiguousPaths,
    'path-http-verbs-order': path_http_verbs_order_1.PathHttpVerbsOrder,
    'no-http-verbs-in-paths': no_http_verbs_in_paths_1.NoHttpVerbsInPaths,
    'path-excludes-patterns': path_excludes_patterns_1.PathExcludesPatterns,
    'request-mime-type': request_mime_type_1.RequestMimeType,
    'response-mime-type': response_mime_type_1.ResponseMimeType,
    'path-segment-plural': path_segment_plural_1.PathSegmentPlural,
    'response-contains-header': response_contains_header_1.ResponseContainsHeader,
    'response-contains-property': response_contains_property_1.ResponseContainsProperty,
    'scalar-property-missing-example': scalar_property_missing_example_1.ScalarPropertyMissingExample,
    'required-string-property-missing-min-length': required_string_property_missing_min_length_1.RequiredStringPropertyMissingMinLength,
    'spec-strict-refs': spec_strict_refs_1.SpecStrictRefs,
    'no-required-schema-properties-undefined': no_required_schema_properties_undefined_1.NoRequiredSchemaPropertiesUndefined,
    'no-schema-type-mismatch': no_schema_type_mismatch_1.NoSchemaTypeMismatch,
};
exports.preprocessors = {};
