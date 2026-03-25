"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessors = exports.rules = void 0;
const struct_1 = require("../common/struct");
const assertions_1 = require("../common/assertions");
const sourceDescription_type_1 = require("../arazzo/sourceDescription-type");
const sourceDescriptions_not_empty_1 = require("./sourceDescriptions-not-empty");
const spot_supported_versions_1 = require("../spot/spot-supported-versions");
const workflowId_unique_1 = require("./workflowId-unique");
const stepId_unique_1 = require("./stepId-unique");
const sourceDescriptions_name_unique_1 = require("./sourceDescriptions-name-unique");
const workflow_dependsOn_1 = require("./workflow-dependsOn");
const parameters_unique_1 = require("./parameters-unique");
const step_onSuccess_unique_1 = require("./step-onSuccess-unique");
const step_onFailure_unique_1 = require("./step-onFailure-unique");
const requestBody_replacements_unique_1 = require("./requestBody-replacements-unique");
const no_criteria_xpath_1 = require("../spot/no-criteria-xpath");
const criteria_unique_1 = require("./criteria-unique");
exports.rules = {
    struct: struct_1.Struct,
    assertions: assertions_1.Assertions,
    'sourceDescription-type': sourceDescription_type_1.SourceDescriptionType,
    'spot-supported-versions': spot_supported_versions_1.SpotSupportedVersions,
    'workflowId-unique': workflowId_unique_1.WorkflowIdUnique,
    'stepId-unique': stepId_unique_1.StepIdUnique,
    'sourceDescription-name-unique': sourceDescriptions_name_unique_1.SourceDescriptionsNameUnique,
    'sourceDescriptions-not-empty': sourceDescriptions_not_empty_1.SourceDescriptionsNotEmpty,
    'workflow-dependsOn': workflow_dependsOn_1.WorkflowDependsOn,
    'parameters-unique': parameters_unique_1.ParametersUnique,
    'step-onSuccess-unique': step_onSuccess_unique_1.StepOnSuccessUnique,
    'step-onFailure-unique': step_onFailure_unique_1.StepOnFailureUnique,
    'requestBody-replacements-unique': requestBody_replacements_unique_1.RequestBodyReplacementsUnique,
    'no-criteria-xpath': no_criteria_xpath_1.NoCriteriaXpath,
    'criteria-unique': criteria_unique_1.CriteriaUnique,
};
exports.preprocessors = {};
