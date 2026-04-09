import { rootRedoclyConfigSchema } from '@redocly/config';
import { listOf } from '.';
import { SpecVersion, getTypes } from '../oas-types';
import { isCustomRuleId, omitObjectProps, pickObjectProps } from '../utils';
import { getNodeTypesFromJSONSchema } from './json-schema-adapter';
import { normalizeTypes } from '../types';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType } from '.';
import type { Config } from '../config';

const builtInOAS2Rules = [
  'info-contact',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'info-license-url',
  'info-license-strict',
  'info-license',
  'no-ambiguous-paths',
  'no-enum-type-mismatch',
  'no-http-verbs-in-paths',
  'no-identical-paths',
  'no-invalid-parameter-examples',
  'no-invalid-schema-examples',
  'no-path-trailing-slash',
  'operation-2xx-response',
  'operation-4xx-response',
  'operation-description',
  'operation-operationId-unique',
  'operation-operationId-url-safe',
  'operation-parameters-unique',
  'operation-singular-tag',
  'operation-summary',
  'operation-tag-defined',
  'parameter-description',
  'path-declaration-must-exist',
  'path-excludes-patterns',
  'path-http-verbs-order',
  'path-not-include-query',
  'path-params-defined',
  'path-parameters-defined',
  'path-segment-plural',
  'paths-kebab-case',
  'required-string-property-missing-min-length',
  'response-contains-header',
  'scalar-property-missing-example',
  'security-defined',
  'spec-strict-refs',
  'no-unresolved-refs',
  'no-required-schema-properties-undefined',
  'no-schema-type-mismatch',
  'boolean-parameter-prefixes',
  'request-mime-type',
  'response-contains-property',
  'response-mime-type',
] as const;

export type BuiltInOAS2RuleId = typeof builtInOAS2Rules[number];

const builtInOAS3Rules = [
  'info-contact',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'info-license-url',
  'info-license-strict',
  'info-license',
  'no-ambiguous-paths',
  'no-enum-type-mismatch',
  'no-http-verbs-in-paths',
  'no-identical-paths',
  'no-invalid-parameter-examples',
  'no-invalid-schema-examples',
  'no-path-trailing-slash',
  'operation-2xx-response',
  'operation-4xx-response',
  'operation-description',
  'operation-operationId-unique',
  'operation-operationId-url-safe',
  'operation-parameters-unique',
  'operation-singular-tag',
  'operation-summary',
  'operation-tag-defined',
  'parameter-description',
  'path-declaration-must-exist',
  'path-excludes-patterns',
  'path-http-verbs-order',
  'path-not-include-query',
  'path-params-defined',
  'path-parameters-defined',
  'path-segment-plural',
  'paths-kebab-case',
  'required-string-property-missing-min-length',
  'response-contains-header',
  'scalar-property-missing-example',
  'security-defined',
  'spec-strict-refs',
  'no-unresolved-refs',
  'no-required-schema-properties-undefined',
  'no-schema-type-mismatch',
  'boolean-parameter-prefixes',
  'component-name-unique',
  'no-empty-servers',
  'no-example-value-and-externalValue',
  'no-invalid-media-type-examples',
  'no-server-example.com',
  'no-server-trailing-slash',
  'no-server-variables-empty-enum',
  'no-undefined-server-variable',
  'no-unused-components',
  'operation-4xx-problem-details-rfc7807',
  'request-mime-type',
  'response-contains-property',
  'response-mime-type',
  'spec-components-invalid-map-name',
  'array-parameter-serialization',
] as const;

export type BuiltInOAS3RuleId = typeof builtInOAS3Rules[number];

const builtInAsync2Rules = [
  'info-contact',
  'info-license-strict',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'channels-kebab-case',
  'no-channel-trailing-slash',
] as const;

const builtInAsync3Rules = [
  'info-contact',
  'info-license-strict',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'channels-kebab-case',
  'no-channel-trailing-slash',
] as const;

export type BuiltInAsync2RuleId = typeof builtInAsync2Rules[number];

export type BuiltInAsync3RuleId = typeof builtInAsync3Rules[number];

const builtInArazzo1Rules = [
  'sourceDescription-type',
  'workflowId-unique',
  'stepId-unique',
  'sourceDescription-name-unique',
  'sourceDescriptions-not-empty',
  'workflow-dependsOn',
  'parameters-unique',
  'step-onSuccess-unique',
  'step-onFailure-unique',
  'respect-supported-versions',
  'requestBody-replacements-unique',
  'no-criteria-xpath',
  'criteria-unique',
] as const;

export type BuiltInArazzo1RuleId = typeof builtInArazzo1Rules[number];

const builtInOverlay1Rules = ['info-contact'] as const;

export type BuiltInOverlay1RuleId = typeof builtInOverlay1Rules[number];

const builtInRules = [
  ...builtInOAS2Rules,
  ...builtInOAS3Rules,
  ...builtInAsync2Rules,
  ...builtInAsync3Rules,
  ...builtInArazzo1Rules,
  ...builtInOverlay1Rules,
  'spec', // TODO: depricated in favor of struct
  'struct',
] as const;

type BuiltInRuleId = typeof builtInRules[number];

const oas2NodeTypesList = [
  'Root',
  'Tag',
  'TagList',
  'ExternalDocs',
  'SecurityRequirement',
  'SecurityRequirementList',
  'Info',
  'Contact',
  'License',
  'Paths',
  'PathItem',
  'Parameter',
  'ParameterList',
  'ParameterItems',
  'Operation',
  'Example',
  'ExamplesMap',
  'Examples',
  'Header',
  'Responses',
  'Response',
  'Schema',
  'Xml',
  'SchemaProperties',
  'NamedSchemas',
  'NamedResponses',
  'NamedParameters',
  'NamedSecuritySchemes',
  'SecurityScheme',
  'TagGroup',
  'TagGroups',
  'EnumDescriptions',
  'Logo',
  'XCodeSample',
  'XCodeSampleList',
  'XServer',
  'XServerList',
] as const;

export type Oas2NodeType = typeof oas2NodeTypesList[number];

const oas3NodeTypesList = [
  'Root',
  'Tag',
  'TagList',
  'ExternalDocs',
  'Server',
  'ServerList',
  'ServerVariable',
  'ServerVariablesMap',
  'SecurityRequirement',
  'SecurityRequirementList',
  'Info',
  'Contact',
  'License',
  'Paths',
  'PathItem',
  'Parameter',
  'ParameterList',
  'Operation',
  'Callback',
  'CallbacksMap',
  'RequestBody',
  'MediaTypesMap',
  'MediaType',
  'Example',
  'ExamplesMap',
  'Encoding',
  'EncodingMap',
  'Header',
  'HeadersMap',
  'Responses',
  'Response',
  'Link',
  'LinksMap',
  'Schema',
  'Xml',
  'SchemaProperties',
  'DiscriminatorMapping',
  'Discriminator',
  'Components',
  'NamedSchemas',
  'NamedResponses',
  'NamedParameters',
  'NamedExamples',
  'NamedRequestBodies',
  'NamedHeaders',
  'NamedSecuritySchemes',
  'NamedLinks',
  'NamedCallbacks',
  'ImplicitFlow',
  'PasswordFlow',
  'ClientCredentials',
  'AuthorizationCode',
  'OAuth2Flows',
  'SecurityScheme',
  'TagGroup',
  'TagGroups',
  'EnumDescriptions',
  'Logo',
  'XCodeSample',
  'XCodeSampleList',
  'XUsePkce',
  'WebhooksMap',
] as const;

export type Oas3NodeType = typeof oas3NodeTypesList[number];

const oas3_1NodeTypesList = [
  'Root',
  'Schema',
  'SchemaProperties',
  'PatternProperties',
  'Info',
  'License',
  'Components',
  'NamedPathItems',
  'SecurityScheme',
  'Operation',
  'DependentRequired',
] as const;

export type Oas3_1NodeType = typeof oas3_1NodeTypesList[number];

const ConfigStyleguide: NodeType = {
  properties: {
    extends: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    rules: 'Rules',
    oas2Rules: 'Rules',
    oas3_0Rules: 'Rules',
    oas3_1Rules: 'Rules',
    async2Rules: 'Rules',
    arazzo1Rules: 'Rules',
    preprocessors: { type: 'object' },
    oas2Preprocessors: { type: 'object' },
    oas3_0Preprocessors: { type: 'object' },
    oas3_1Preprocessors: { type: 'object' },
    async2Preprocessors: { type: 'object' },
    arazzoPreprocessors: { type: 'object' },
    decorators: { type: 'object' },
    oas2Decorators: { type: 'object' },
    oas3_0Decorators: { type: 'object' },
    oas3_1Decorators: { type: 'object' },
    async2Decorators: { type: 'object' },
    arazzo1Decorators: { type: 'object' },
  },
};

const createConfigRoot = (nodeTypes: Record<string, NodeType>): NodeType => ({
  ...nodeTypes.rootRedoclyConfigSchema,
  properties: {
    ...nodeTypes.rootRedoclyConfigSchema.properties,
    ...ConfigStyleguide.properties,
    apis: 'ConfigApis', // Override apis with internal format
    'features.openapi': 'ConfigReferenceDocs', // deprecated
    'features.mockServer': 'ConfigMockServer', // deprecated
    organization: { type: 'string' },
    region: { enum: ['us', 'eu'] },
    telemetry: { enum: ['on', 'off'] },
    resolve: {
      properties: {
        http: 'ConfigHTTP',
        doNotResolveExamples: { type: 'boolean' },
      },
    },
    files: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
});

const ConfigApis: NodeType = {
  properties: {},
  additionalProperties: 'ConfigApisProperties',
};

const createConfigApisProperties = (nodeTypes: Record<string, NodeType>): NodeType => ({
  ...nodeTypes['rootRedoclyConfigSchema.apis_additionalProperties'],
  properties: {
    ...nodeTypes['rootRedoclyConfigSchema.apis_additionalProperties']?.properties,
    labels: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    ...ConfigStyleguide.properties,
    'features.openapi': 'ConfigReferenceDocs', // deprecated
    'features.mockServer': 'ConfigMockServer', // deprecated
    files: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
});

const ConfigHTTP: NodeType = {
  properties: {
    headers: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
};

const Rules: NodeType = {
  properties: {},
  additionalProperties: (value: unknown, key: string) => {
    if (key.startsWith('rule/')) {
      if (typeof value === 'string') {
        return { enum: ['error', 'warn', 'off'] };
      } else {
        return 'Assert';
      }
    } else if (key.startsWith('assert/')) {
      // keep the old assert/ prefix as an alias
      if (typeof value === 'string') {
        return { enum: ['error', 'warn', 'off'] };
      } else {
        return 'Assert';
      }
    } else if (builtInRules.includes(key as BuiltInRuleId) || isCustomRuleId(key)) {
      if (typeof value === 'string') {
        return { enum: ['error', 'warn', 'off'] };
      } else {
        return 'ObjectRule';
      }
    } else if (key === 'metadata-schema' || key === 'custom-fields-schema') {
      return 'Schema';
    }
    // Otherwise is considered as invalid
    return;
  },
};

const ObjectRule: NodeType = {
  properties: {
    severity: { enum: ['error', 'warn', 'off'] },
  },
  additionalProperties: {},
  required: ['severity'],
};

// TODO: add better type tree for this
const Schema: NodeType = {
  properties: {},
  additionalProperties: {},
};

function createAssertionDefinitionSubject(nodeNames: string[]): NodeType {
  return {
    properties: {
      type: {
        enum: [...new Set(['any', ...nodeNames, 'SpecExtension'])],
      },
      property: (value: unknown) => {
        if (Array.isArray(value)) {
          return { type: 'array', items: { type: 'string' } };
        } else if (value === null) {
          return null;
        } else {
          return { type: 'string' };
        }
      },
      filterInParentKeys: { type: 'array', items: { type: 'string' } },
      filterOutParentKeys: { type: 'array', items: { type: 'string' } },
      matchParentKeys: { type: 'string' },
    },
    required: ['type'],
  };
}

const AssertionDefinitionAssertions: NodeType = {
  properties: {
    enum: { type: 'array', items: { type: 'string' } },
    pattern: { type: 'string' },
    notPattern: { type: 'string' },
    casing: {
      enum: [
        'camelCase',
        'kebab-case',
        'snake_case',
        'PascalCase',
        'MACRO_CASE',
        'COBOL-CASE',
        'flatcase',
      ],
    },
    mutuallyExclusive: { type: 'array', items: { type: 'string' } },
    mutuallyRequired: { type: 'array', items: { type: 'string' } },
    required: { type: 'array', items: { type: 'string' } },
    requireAny: { type: 'array', items: { type: 'string' } },
    disallowed: { type: 'array', items: { type: 'string' } },
    defined: { type: 'boolean' },
    // undefined: { type: 'boolean' }, // TODO: Remove `undefined` assertion from codebase overall
    nonEmpty: { type: 'boolean' },
    minLength: { type: 'integer' },
    maxLength: { type: 'integer' },
    ref: (value: string | boolean) =>
      typeof value === 'string' ? { type: 'string' } : { type: 'boolean' },
    const: (value: string | boolean | number) => {
      if (typeof value === 'string') {
        return { type: 'string' };
      }
      if (typeof value === 'number') {
        return { type: 'number' };
      }
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return;
      }
    },
  },
  additionalProperties: (_value: unknown, key: string) => {
    if (/^\w+\/\w+$/.test(key)) return { type: 'object' };
    return;
  },
};

const AssertDefinition: NodeType = {
  properties: {
    subject: 'AssertionDefinitionSubject',
    assertions: 'AssertionDefinitionAssertions',
  },
  required: ['subject', 'assertions'],
};

const Assert: NodeType = {
  properties: {
    subject: 'AssertionDefinitionSubject',
    assertions: 'AssertionDefinitionAssertions',
    where: listOf('AssertDefinition'),
    message: { type: 'string' },
    suggest: { type: 'array', items: { type: 'string' } },
    severity: { enum: ['error', 'warn', 'off'] },
  },
  required: ['subject', 'assertions'],
};

const ConfigLanguage: NodeType = {
  properties: {
    label: { type: 'string' },
    lang: {
      enum: [
        'curl',
        'C#',
        'Go',
        'Java',
        'Java8+Apache',
        'JavaScript',
        'Node.js',
        'PHP',
        'Python',
        'R',
        'Ruby',
      ],
    },
  },
  required: ['lang'],
};

const ConfigLabels: NodeType = {
  properties: {
    enum: { type: 'string' },
    enumSingleValue: { type: 'string' },
    enumArray: { type: 'string' },
    default: { type: 'string' },
    deprecated: { type: 'string' },
    example: { type: 'string' },
    examples: { type: 'string' },
    nullable: { type: 'string' },
    recursive: { type: 'string' },
    arrayOf: { type: 'string' },
    webhook: { type: 'string' },
    authorizations: { type: 'string' },
    tryItAuthBasicUsername: { type: 'string' },
    tryItAuthBasicPassword: { type: 'string' },
  },
};

const ConfigSidebarLinks: NodeType = {
  properties: {
    beforeInfo: listOf('CommonConfigSidebarLinks'),
    end: listOf('CommonConfigSidebarLinks'),
  },
};

const CommonConfigSidebarLinks: NodeType = {
  properties: {
    label: { type: 'string' },
    link: { type: 'string' },
    target: { type: 'string' },
  },
  required: ['label', 'link'],
};

const CommonThemeColors: NodeType = {
  properties: {
    main: { type: 'string' },
    light: { type: 'string' },
    dark: { type: 'string' },
    contrastText: { type: 'string' },
  },
};

const CommonColorProps: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    borderColor: { type: 'string' },
    color: { type: 'string' },
    tabTextColor: { type: 'string' },
  },
};

const BorderThemeColors: NodeType = {
  properties: pickObjectProps(CommonThemeColors.properties, ['light', 'dark']),
};

const HttpColors: NodeType = {
  properties: {
    basic: { type: 'string' },
    delete: { type: 'string' },
    get: { type: 'string' },
    head: { type: 'string' },
    link: { type: 'string' },
    options: { type: 'string' },
    patch: { type: 'string' },
    post: { type: 'string' },
    put: { type: 'string' },
  },
};

const ResponseColors: NodeType = {
  properties: {
    error: 'CommonColorProps',
    info: 'CommonColorProps',
    redirect: 'CommonColorProps',
    success: 'CommonColorProps',
  },
};

const SecondaryColors: NodeType = {
  properties: omitObjectProps(CommonThemeColors.properties, ['dark']),
};

const TextThemeColors: NodeType = {
  properties: {
    primary: { type: 'string' },
    secondary: { type: 'string' },
    light: { type: 'string' },
  },
};

const ThemeColors: NodeType = {
  properties: {
    accent: 'CommonThemeColors',
    border: 'BorderThemeColors',
    error: 'CommonThemeColors',
    http: 'HttpColors',
    primary: 'CommonThemeColors',
    responses: 'ResponseColors',
    secondary: 'SecondaryColors',
    success: 'CommonThemeColors',
    text: 'TextThemeColors',
    tonalOffset: { type: 'number' },
    warning: 'CommonThemeColors',
  },
};

const SizeProps: NodeType = {
  properties: {
    fontSize: { type: 'string' },
    padding: { type: 'string' },
    minWidth: { type: 'string' },
  },
};

const Sizes: NodeType = {
  properties: {
    small: 'SizeProps',
    medium: 'SizeProps',
    large: 'SizeProps',
    xlarge: 'SizeProps',
  },
};

const FontConfig: NodeType = {
  properties: {
    fontFamily: { type: 'string' },
    fontSize: { type: 'string' },
    fontWeight: { type: 'string' },
    lineHeight: { type: 'string' },
  },
};

const ButtonsConfig: NodeType = {
  properties: {
    ...omitObjectProps(FontConfig.properties, ['fontSize', 'lineHeight']),
    borderRadius: { type: 'string' },
    hoverStyle: { type: 'string' },
    boxShadow: { type: 'string' },
    hoverBoxShadow: { type: 'string' },
    sizes: 'Sizes',
  },
};

const BadgeFontConfig: NodeType = {
  properties: pickObjectProps(FontConfig.properties, ['fontSize', 'lineHeight']),
};

const BadgeSizes: NodeType = {
  properties: {
    medium: 'BadgeFontConfig',
    small: 'BadgeFontConfig',
  },
};

const HttpBadgesConfig: NodeType = {
  properties: {
    ...omitObjectProps(FontConfig.properties, ['fontSize', 'lineHeight']),
    borderRadius: { type: 'string' },
    color: { type: 'string' },
    sizes: 'BadgeSizes',
  },
};

const LabelControls: NodeType = {
  properties: {
    top: { type: 'string' },
    width: { type: 'string' },
    height: { type: 'string' },
  },
};

const Panels: NodeType = {
  properties: {
    borderRadius: { type: 'string' },
    backgroundColor: { type: 'string' },
  },
};

const TryItButton: NodeType = {
  properties: {
    fullWidth: { type: 'boolean' },
  },
};

const ConfigThemeComponents: NodeType = {
  properties: {
    buttons: 'ButtonsConfig',
    httpBadges: 'HttpBadgesConfig',
    layoutControls: 'LabelControls',
    panels: 'Panels',
    tryItButton: 'TryItButton',
    tryItSendButton: 'TryItButton',
  },
};

const Breakpoints: NodeType = {
  properties: {
    small: { type: 'string' },
    medium: { type: 'string' },
    large: { type: 'string' },
  },
};

const StackedConfig: NodeType = {
  properties: {
    maxWidth: 'Breakpoints',
  },
};

const ThreePanelConfig: NodeType = {
  properties: {
    maxWidth: 'Breakpoints',
    middlePanelMaxWidth: 'Breakpoints',
  },
};

const Layout: NodeType = {
  properties: {
    showDarkRightPanel: { type: 'boolean' },
    stacked: 'StackedConfig',
    'three-panel': 'ThreePanelConfig',
  },
};

const SchemaColorsConfig: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    border: { type: 'string' },
  },
};

const ConfigThemeSchema: NodeType = {
  properties: {
    breakFieldNames: { type: 'boolean' },
    caretColor: { type: 'string' },
    caretSize: { type: 'string' },
    constraints: 'SchemaColorsConfig',
    defaultDetailsWidth: { type: 'string' },
    examples: 'SchemaColorsConfig',
    labelsTextSize: { type: 'string' },
    linesColor: { type: 'string' },
    nestedBackground: { type: 'string' },
    nestingSpacing: { type: 'string' },
    requireLabelColor: { type: 'string' },
    typeNameColor: { type: 'string' },
    typeTitleColor: { type: 'string' },
  },
};

const GroupItemsConfig: NodeType = {
  properties: {
    subItemsColor: { type: 'string' },
    textTransform: { type: 'string' },
    fontWeight: { type: 'string' },
  },
};

const Level1Items: NodeType = {
  properties: pickObjectProps(GroupItemsConfig.properties, ['textTransform']),
};

const SpacingConfig: NodeType = {
  properties: {
    unit: { type: 'number' },
    paddingHorizontal: { type: 'string' },
    paddingVertical: { type: 'string' },
    offsetTop: { type: 'string' },
    offsetLeft: { type: 'string' },
    offsetNesting: { type: 'string' },
  },
};

const Sidebar: NodeType = {
  properties: {
    ...omitObjectProps(FontConfig.properties, ['fontWeight', 'lineHeight']),
    activeBgColor: { type: 'string' },
    activeTextColor: { type: 'string' },
    backgroundColor: { type: 'string' },
    borderRadius: { type: 'string' },
    breakPath: { type: 'boolean' },
    caretColor: { type: 'string' },
    caretSize: { type: 'string' },
    groupItems: 'GroupItemsConfig',
    level1items: 'Level1Items',
    rightLineColor: { type: 'string' },
    separatorLabelColor: { type: 'string' },
    showAtBreakpoint: { type: 'string' },
    spacing: 'SpacingConfig',
    textColor: { type: 'string' },
    width: { type: 'string' },
  },
};

const Heading: NodeType = {
  properties: {
    ...FontConfig.properties,
    color: { type: 'string' },
    transform: { type: 'string' },
  },
};

const CodeConfig: NodeType = {
  properties: {
    ...FontConfig.properties,
    backgroundColor: { type: 'string' },
    color: { type: 'string' },
    wordBreak: {
      enum: [
        'break-all',
        'break-word',
        'keep-all',
        'normal',
        'revert',
        'unset',
        'inherit',
        'initial',
      ],
    },
    wrap: { type: 'boolean' },
  },
};

const HeadingsConfig: NodeType = {
  properties: omitObjectProps(FontConfig.properties, ['fontSize']),
};

const LinksConfig: NodeType = {
  properties: {
    color: { type: 'string' },
    hover: { type: 'string' },
    textDecoration: { type: 'string' },
    hoverTextDecoration: { type: 'string' },
    visited: { type: 'string' },
  },
};

const Typography: NodeType = {
  properties: {
    code: 'CodeConfig',
    fieldName: 'FontConfig',
    ...pickObjectProps(FontConfig.properties, ['fontSize', 'fontFamily']),
    fontWeightBold: { type: 'string' },
    fontWeightLight: { type: 'string' },
    fontWeightRegular: { type: 'string' },
    heading1: 'Heading',
    heading2: 'Heading',
    heading3: 'Heading',
    headings: 'HeadingsConfig',
    lineHeight: { type: 'string' },
    links: 'LinksConfig',
    optimizeSpeed: { type: 'boolean' },
    rightPanelHeading: 'Heading',
    smoothing: { enum: ['auto', 'none', 'antialiased', 'subpixel-antialiased', 'grayscale'] },
  },
};

const TokenProps: NodeType = {
  properties: {
    color: { type: 'string' },
    ...omitObjectProps(FontConfig.properties, ['fontWeight']),
  },
};

const CodeBlock: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    borderRadius: { type: 'string' },
    tokens: 'TokenProps',
  },
};

const ConfigThemeLogo: NodeType = {
  properties: {
    gutter: { type: 'string' },
    maxHeight: { type: 'string' },
    maxWidth: { type: 'string' },
  },
};

const Fab: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    color: { type: 'string' },
  },
};

const ButtonOverrides: NodeType = {
  properties: {
    custom: { type: 'string' },
  },
};

const Overrides: NodeType = {
  properties: {
    DownloadButton: 'ButtonOverrides',
    NextSectionButton: 'ButtonOverrides',
  },
};

const RightPanel: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    panelBackgroundColor: { type: 'string' },
    panelControlsBackgroundColor: { type: 'string' },
    showAtBreakpoint: { type: 'string' },
    textColor: { type: 'string' },
    width: { type: 'string' },
  },
};

const Shape: NodeType = {
  properties: { borderRadius: { type: 'string' } },
};

const ThemeSpacing: NodeType = {
  properties: {
    sectionHorizontal: { type: 'number' },
    sectionVertical: { type: 'number' },
    unit: { type: 'number' },
  },
};

const ConfigTheme: NodeType = {
  properties: {
    breakpoints: 'Breakpoints',
    codeBlock: 'CodeBlock',
    colors: 'ThemeColors',
    components: 'ConfigThemeComponents',
    layout: 'Layout',
    logo: 'ConfigThemeLogo',
    fab: 'Fab',
    overrides: 'Overrides',
    rightPanel: 'RightPanel',
    schema: 'ConfigThemeSchema',
    shape: 'Shape',
    sidebar: 'Sidebar',
    spacing: 'ThemeSpacing',
    typography: 'Typography',
    links: { properties: { color: { type: 'string' } } }, // deprecated
    codeSample: { properties: { backgroundColor: { type: 'string' } } }, // deprecated
  },
};

const GenerateCodeSamples: NodeType = {
  properties: {
    skipOptionalParameters: { type: 'boolean' },
    languages: listOf('ConfigLanguage'),
  },
  required: ['languages'],
};

// TODO: deprecated
const ConfigReferenceDocs: NodeType = {
  properties: {
    theme: 'ConfigTheme',
    corsProxyUrl: { type: 'string' },
    ctrlFHijack: { type: 'boolean' },
    defaultSampleLanguage: { type: 'string' },
    disableDeepLinks: { type: 'boolean' },
    disableSearch: { type: 'boolean' },
    disableSidebar: { type: 'boolean' },
    downloadDefinitionUrl: { type: 'string' },
    expandDefaultServerVariables: { type: 'boolean' },
    enumSkipQuotes: { type: 'boolean' },
    expandDefaultRequest: { type: 'boolean' },
    expandDefaultResponse: { type: 'boolean' },
    expandResponses: { type: 'string' },
    expandSingleSchemaField: { type: 'boolean' },
    generateCodeSamples: 'GenerateCodeSamples',
    generatedPayloadSamplesMaxDepth: { type: 'number' },
    hideDownloadButton: { type: 'boolean' },
    hideHostname: { type: 'boolean' },
    hideInfoSection: { type: 'boolean' },
    hideLoading: { type: 'boolean' },
    hideLogo: { type: 'boolean' },
    hideRequestPayloadSample: { type: 'boolean' },
    hideRightPanel: { type: 'boolean' },
    hideSchemaPattern: { type: 'boolean' },
    hideSchemaTitles: { type: 'boolean' },
    hideSingleRequestSampleTab: { type: 'boolean' },
    hideSecuritySection: { type: 'boolean' },
    hideTryItPanel: { type: 'boolean' },
    hideFab: { type: 'boolean' },
    hideOneOfDescription: { type: 'boolean' },
    htmlTemplate: { type: 'string' },
    jsonSampleExpandLevel: (value: unknown) => {
      if (typeof value === 'number') {
        return { type: 'number', minimum: 1 };
      } else {
        return { type: 'string' };
      }
    },
    labels: 'ConfigLabels',
    layout: { enum: ['stacked', 'three-panel'] },
    maxDisplayedEnumValues: { type: 'number' },
    menuToggle: { type: 'boolean' },
    nativeScrollbars: { type: 'boolean' },
    noAutoAuth: { type: 'boolean' }, // deprecated
    oAuth2RedirectURI: { type: 'string' },
    onDeepLinkClick: { type: 'object' },
    onlyRequiredInSamples: { type: 'boolean' },
    pagination: { enum: ['none', 'section', 'item'] },
    pathInMiddlePanel: { type: 'boolean' },
    payloadSampleIdx: { type: 'number', minimum: 0 },
    requestInterceptor: { type: 'object' },
    requiredPropsFirst: { type: 'boolean' },
    routingBasePath: { type: 'string' },
    routingStrategy: { type: 'string' }, // deprecated
    samplesTabsMaxCount: { type: 'number' },
    schemaExpansionLevel: (value: unknown) => {
      if (typeof value === 'number') {
        return { type: 'number', minimum: 0 };
      } else {
        return { type: 'string' };
      }
    },
    schemaDefinitionsTagName: { type: 'string' },
    minCharacterLengthToInitSearch: { type: 'number', minimum: 1 },
    maxResponseHeadersToShowInTryIt: { type: 'number', minimum: 0 },
    scrollYOffset: (value: unknown) => {
      if (typeof value === 'number') {
        return { type: 'number' };
      } else {
        return { type: 'string' };
      }
    },
    searchAutoExpand: { type: 'boolean' },
    searchFieldLevelBoost: { type: 'number', minimum: 0 },
    searchMaxDepth: { type: 'number', minimum: 1 },
    searchMode: { enum: ['default', 'path-only'] },
    searchOperationTitleBoost: { type: 'number' },
    searchTagTitleBoost: { type: 'number' },
    sendXUserAgentInTryIt: { type: 'boolean' },
    showChangeLayoutButton: { type: 'boolean' },
    showConsole: { type: 'boolean' }, // deprecated
    showExtensions: (value: unknown) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return {
          type: 'array',
          items: {
            type: 'string',
          },
        };
      }
    },
    showNextButton: { type: 'boolean' },
    showRightPanelToggle: { type: 'boolean' },
    showSecuritySchemeType: { type: 'boolean' },
    showWebhookVerb: { type: 'boolean' },
    showObjectSchemaExamples: { type: 'boolean' },
    disableTryItRequestUrlEncoding: { type: 'boolean' },
    sidebarLinks: 'ConfigSidebarLinks',
    sideNavStyle: { enum: ['summary-only', 'path-first', 'id-only', 'path-only'] },
    simpleOneOfTypeLabel: { type: 'boolean' },
    sortEnumValuesAlphabetically: { type: 'boolean' },
    sortOperationsAlphabetically: { type: 'boolean' },
    sortPropsAlphabetically: { type: 'boolean' },
    sortTagsAlphabetically: { type: 'boolean' },
    suppressWarnings: { type: 'boolean' }, // deprecated
    unstable_externalDescription: { type: 'boolean' }, // deprecated
    unstable_ignoreMimeParameters: { type: 'boolean' },
    untrustedDefinition: { type: 'boolean' },
    mockServer: {
      properties: {
        url: { type: 'string' },
        position: { enum: ['first', 'last', 'replace', 'off'] },
        description: { type: 'string' },
      },
    },
    showAccessMode: { type: 'boolean' },
    preserveOriginalExtensionsName: { type: 'boolean' },
    markdownHeadingsAnchorLevel: { type: 'number' },
  },
  additionalProperties: {},
};

const ConfigMockServer: NodeType = {
  properties: {
    strictExamples: { type: 'boolean' },
    errorIfForcedExampleNotFound: { type: 'boolean' },
  },
};

export function createConfigTypes(extraSchemas: JSONSchema, config?: Config) {
  const nodeNames = Object.values(SpecVersion).flatMap((version) => {
    const types = config?.styleguide
      ? config.styleguide.extendTypes(getTypes(version), version)
      : getTypes(version);
    return Object.keys(types);
  });
  // Create types based on external schemas
  const nodeTypes = getNodeTypesFromJSONSchema('rootRedoclyConfigSchema', extraSchemas);

  return {
    ...CoreConfigTypes,
    ConfigRoot: createConfigRoot(nodeTypes), // This is the REAL config root type
    ConfigApisProperties: createConfigApisProperties(nodeTypes),
    AssertionDefinitionSubject: createAssertionDefinitionSubject(nodeNames),
    ...nodeTypes,
  };
}

const CoreConfigTypes: Record<string, NodeType> = {
  Assert,
  ConfigApis,
  ConfigStyleguide,
  ConfigReferenceDocs,
  ConfigMockServer,
  ConfigHTTP,
  ConfigLanguage,
  ConfigLabels,
  ConfigSidebarLinks,
  CommonConfigSidebarLinks,
  ConfigTheme,
  AssertDefinition,
  ThemeColors,
  CommonThemeColors,
  BorderThemeColors,
  HttpColors,
  ResponseColors,
  SecondaryColors,
  TextThemeColors,
  Sizes,
  ButtonsConfig,
  CommonColorProps,
  BadgeFontConfig,
  BadgeSizes,
  HttpBadgesConfig,
  LabelControls,
  Panels,
  TryItButton,
  Breakpoints,
  StackedConfig,
  ThreePanelConfig,
  SchemaColorsConfig,
  SizeProps,
  Level1Items,
  SpacingConfig,
  FontConfig,
  CodeConfig,
  HeadingsConfig,
  LinksConfig,
  TokenProps,
  CodeBlock,
  ConfigThemeLogo,
  Fab,
  ButtonOverrides,
  Overrides,
  ObjectRule,
  Schema,
  RightPanel,
  Rules,
  Shape,
  ThemeSpacing,
  GenerateCodeSamples,
  GroupItemsConfig,
  ConfigThemeComponents,
  Layout,
  ConfigThemeSchema,
  Sidebar,
  Heading,
  Typography,
  AssertionDefinitionAssertions,
};

export const ConfigTypes: Record<string, NodeType> = createConfigTypes(rootRedoclyConfigSchema);
export const NormalizedConfigTypes = normalizeTypes(ConfigTypes);
