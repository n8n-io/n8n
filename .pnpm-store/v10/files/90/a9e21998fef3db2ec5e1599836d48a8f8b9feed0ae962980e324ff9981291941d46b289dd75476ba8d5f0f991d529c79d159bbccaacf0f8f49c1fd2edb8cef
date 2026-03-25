// Needed for supporting deprecated Reference Docs config options
// Transferred from https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/types/redocly-yaml.ts
const ConfigLanguage = {
    type: 'object',
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
const ConfigLabels = {
    type: 'object',
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
const CommonConfigSidebarLinks = {
    type: 'object',
    properties: {
        label: { type: 'string' },
        link: { type: 'string' },
        target: { type: 'string' },
    },
    required: ['label', 'link'],
};
const ConfigSidebarLinks = {
    type: 'object',
    properties: {
        beforeInfo: { type: 'array', items: CommonConfigSidebarLinks },
        end: { type: 'array', items: CommonConfigSidebarLinks },
    },
};
const CommonThemeColors = {
    type: 'object',
    properties: {
        main: { type: 'string' },
        light: { type: 'string' },
        dark: { type: 'string' },
        contrastText: { type: 'string' },
    },
};
const CommonColorProps = {
    type: 'object',
    properties: {
        backgroundColor: { type: 'string' },
        borderColor: { type: 'string' },
        color: { type: 'string' },
        tabTextColor: { type: 'string' },
    },
};
const BorderThemeColors = {
    type: 'object',
    properties: pickObjectProps(CommonThemeColors.properties, ['light', 'dark']),
};
const HttpColors = {
    type: 'object',
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
const ResponseColors = {
    type: 'object',
    properties: {
        error: CommonColorProps,
        info: CommonColorProps,
        redirect: CommonColorProps,
        success: CommonColorProps,
    },
};
const SecondaryColors = {
    type: 'object',
    properties: omitObjectProps(CommonThemeColors.properties, ['dark']),
};
const TextThemeColors = {
    type: 'object',
    properties: {
        primary: { type: 'string' },
        secondary: { type: 'string' },
        light: { type: 'string' },
    },
};
const ThemeColors = {
    type: 'object',
    properties: {
        accent: CommonThemeColors,
        border: BorderThemeColors,
        error: CommonThemeColors,
        http: HttpColors,
        primary: CommonThemeColors,
        responses: ResponseColors,
        secondary: SecondaryColors,
        success: CommonThemeColors,
        text: TextThemeColors,
        tonalOffset: { type: 'number' },
        warning: CommonThemeColors,
    },
};
const SizeProps = {
    type: 'object',
    properties: {
        fontSize: { type: 'string' },
        padding: { type: 'string' },
        minWidth: { type: 'string' },
    },
};
const Sizes = {
    type: 'object',
    properties: {
        small: SizeProps,
        medium: SizeProps,
        large: SizeProps,
        xlarge: SizeProps,
    },
};
const FontConfig = {
    type: 'object',
    properties: {
        fontFamily: { type: 'string' },
        fontSize: { type: 'string' },
        fontWeight: { type: 'string' },
        lineHeight: { type: 'string' },
    },
};
const ButtonsConfig = {
    type: 'object',
    properties: Object.assign(Object.assign({}, omitObjectProps(FontConfig.properties, ['fontSize', 'lineHeight'])), { borderRadius: { type: 'string' }, hoverStyle: { type: 'string' }, boxShadow: { type: 'string' }, hoverBoxShadow: { type: 'string' }, sizes: Sizes }),
};
const BadgeFontConfig = {
    type: 'object',
    properties: pickObjectProps(FontConfig.properties, ['fontSize', 'lineHeight']),
};
const BadgeSizes = {
    type: 'object',
    properties: {
        medium: BadgeFontConfig,
        small: BadgeFontConfig,
    },
};
const HttpBadgesConfig = {
    type: 'object',
    properties: Object.assign(Object.assign({}, omitObjectProps(FontConfig.properties, ['fontSize', 'lineHeight'])), { borderRadius: { type: 'string' }, color: { type: 'string' }, sizes: BadgeSizes }),
};
const LabelControls = {
    type: 'object',
    properties: {
        top: { type: 'string' },
        width: { type: 'string' },
        height: { type: 'string' },
    },
};
const Panels = {
    type: 'object',
    properties: {
        borderRadius: { type: 'string' },
        backgroundColor: { type: 'string' },
    },
};
const TryItButton = {
    type: 'object',
    properties: {
        fullWidth: { type: 'boolean' },
    },
};
const ConfigThemeComponents = {
    type: 'object',
    properties: {
        buttons: ButtonsConfig,
        httpBadges: HttpBadgesConfig,
        layoutControls: LabelControls,
        panels: Panels,
        tryItButton: TryItButton,
        tryItSendButton: TryItButton,
    },
};
const Breakpoints = {
    type: 'object',
    properties: {
        small: { type: 'string' },
        medium: { type: 'string' },
        large: { type: 'string' },
    },
};
const StackedConfig = {
    type: 'object',
    properties: {
        maxWidth: Breakpoints,
    },
};
const ThreePanelConfig = {
    type: 'object',
    properties: {
        maxWidth: Breakpoints,
        middlePanelMaxWidth: Breakpoints,
    },
};
const Layout = {
    type: 'object',
    properties: {
        showDarkRightPanel: { type: 'boolean' },
        stacked: StackedConfig,
        'three-panel': ThreePanelConfig,
    },
};
const SchemaColorsConfig = {
    type: 'object',
    properties: {
        backgroundColor: { type: 'string' },
        border: { type: 'string' },
    },
};
const ConfigThemeSchema = {
    type: 'object',
    properties: {
        breakFieldNames: { type: 'boolean' },
        caretColor: { type: 'string' },
        caretSize: { type: 'string' },
        constraints: SchemaColorsConfig,
        defaultDetailsWidth: { type: 'string' },
        examples: SchemaColorsConfig,
        labelsTextSize: { type: 'string' },
        linesColor: { type: 'string' },
        nestedBackground: { type: 'string' },
        nestingSpacing: { type: 'string' },
        requireLabelColor: { type: 'string' },
        typeNameColor: { type: 'string' },
        typeTitleColor: { type: 'string' },
    },
};
const GroupItemsConfig = {
    type: 'object',
    properties: {
        subItemsColor: { type: 'string' },
        textTransform: { type: 'string' },
        fontWeight: { type: 'string' },
    },
};
const Level1Items = {
    type: 'object',
    properties: pickObjectProps(GroupItemsConfig.properties, ['textTransform']),
};
const SpacingConfig = {
    type: 'object',
    properties: {
        unit: { type: 'number' },
        paddingHorizontal: { type: 'string' },
        paddingVertical: { type: 'string' },
        offsetTop: { type: 'string' },
        offsetLeft: { type: 'string' },
        offsetNesting: { type: 'string' },
    },
};
const Sidebar = {
    type: 'object',
    properties: Object.assign(Object.assign({}, omitObjectProps(FontConfig.properties, ['fontWeight', 'lineHeight'])), { activeBgColor: { type: 'string' }, activeTextColor: { type: 'string' }, backgroundColor: { type: 'string' }, borderRadius: { type: 'string' }, breakPath: { type: 'boolean' }, caretColor: { type: 'string' }, caretSize: { type: 'string' }, groupItems: GroupItemsConfig, level1items: Level1Items, rightLineColor: { type: 'string' }, separatorLabelColor: { type: 'string' }, showAtBreakpoint: { type: 'string' }, spacing: SpacingConfig, textColor: { type: 'string' }, width: { type: 'string' } }),
};
const Heading = {
    type: 'object',
    properties: Object.assign(Object.assign({}, FontConfig.properties), { color: { type: 'string' }, transform: { type: 'string' } }),
};
const CodeConfig = {
    type: 'object',
    properties: Object.assign(Object.assign({}, FontConfig.properties), { backgroundColor: { type: 'string' }, color: { type: 'string' }, wordBreak: {
            type: 'string',
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
        }, wrap: { type: 'boolean' } }),
};
const HeadingsConfig = {
    type: 'object',
    properties: omitObjectProps(FontConfig.properties, ['fontSize']),
};
const LinksConfig = {
    type: 'object',
    properties: {
        color: { type: 'string' },
        hover: { type: 'string' },
        textDecoration: { type: 'string' },
        hoverTextDecoration: { type: 'string' },
        visited: { type: 'string' },
    },
};
const Typography = {
    type: 'object',
    properties: Object.assign(Object.assign({ code: CodeConfig, fieldName: FontConfig }, pickObjectProps(FontConfig.properties, ['fontSize', 'fontFamily'])), { fontWeightBold: { type: 'string' }, fontWeightLight: { type: 'string' }, fontWeightRegular: { type: 'string' }, heading1: Heading, heading2: Heading, heading3: Heading, headings: HeadingsConfig, lineHeight: { type: 'string' }, links: LinksConfig, optimizeSpeed: { type: 'boolean' }, rightPanelHeading: Heading, smoothing: {
            type: 'string',
            enum: ['auto', 'none', 'antialiased', 'subpixel-antialiased', 'grayscale'],
        } }),
};
const TokenProps = {
    type: 'object',
    properties: Object.assign({ color: { type: 'string' } }, omitObjectProps(FontConfig.properties, ['fontWeight'])),
};
const CodeBlock = {
    type: 'object',
    properties: {
        backgroundColor: { type: 'string' },
        borderRadius: { type: 'string' },
        tokens: TokenProps,
    },
};
const ConfigThemeLogo = {
    type: 'object',
    properties: {
        gutter: { type: 'string' },
        maxHeight: { type: 'string' },
        maxWidth: { type: 'string' },
    },
};
const Fab = {
    type: 'object',
    properties: {
        backgroundColor: { type: 'string' },
        color: { type: 'string' },
    },
};
const ButtonOverrides = {
    type: 'object',
    properties: {
        custom: { type: 'string' },
    },
};
const Overrides = {
    type: 'object',
    properties: {
        DownloadButton: ButtonOverrides,
        NextSectionButton: ButtonOverrides,
    },
};
const RightPanel = {
    type: 'object',
    properties: {
        backgroundColor: { type: 'string' },
        panelBackgroundColor: { type: 'string' },
        panelControlsBackgroundColor: { type: 'string' },
        showAtBreakpoint: { type: 'string' },
        textColor: { type: 'string' },
        width: { type: 'string' },
    },
};
const Shape = {
    type: 'object',
    properties: { borderRadius: { type: 'string' } },
};
const ThemeSpacing = {
    type: 'object',
    properties: {
        sectionHorizontal: { type: 'number' },
        sectionVertical: { type: 'number' },
        unit: { type: 'number' },
    },
};
const ConfigTheme = {
    type: 'object',
    properties: {
        breakpoints: Breakpoints,
        codeBlock: CodeBlock,
        colors: ThemeColors,
        components: ConfigThemeComponents,
        layout: Layout,
        logo: ConfigThemeLogo,
        fab: Fab,
        overrides: Overrides,
        rightPanel: RightPanel,
        schema: ConfigThemeSchema,
        shape: Shape,
        sidebar: Sidebar,
        spacing: ThemeSpacing,
        typography: Typography,
        links: { properties: { color: { type: 'string' } } },
        codeSample: { properties: { backgroundColor: { type: 'string' } } },
    },
};
const GenerateCodeSamples = {
    type: 'object',
    properties: {
        skipOptionalParameters: { type: 'boolean' },
        languages: { type: 'array', items: ConfigLanguage },
    },
    required: ['languages'],
};
export const deprecatedRefDocsSchema = {
    type: 'object',
    properties: {
        theme: ConfigTheme,
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
        generateCodeSamples: GenerateCodeSamples,
        generatedPayloadSamplesMaxDepth: { type: 'number' },
        hideDownloadButton: { type: 'boolean' },
        hideHostname: { type: 'boolean' },
        hideInfoSection: { type: 'boolean' },
        hideLogo: { type: 'boolean' },
        hideRequestPayloadSample: { type: 'boolean' },
        hideRightPanel: { type: 'boolean' },
        hideSchemaPattern: { type: 'boolean' },
        hideSingleRequestSampleTab: { type: 'boolean' },
        hideSecuritySection: { type: 'boolean' },
        hideTryItPanel: { type: 'boolean' },
        hideFab: { type: 'boolean' },
        hideOneOfDescription: { type: 'boolean' },
        htmlTemplate: { type: 'string' },
        jsonSampleExpandLevel: {
            oneOf: [{ type: 'number', minimum: 1 }, { type: 'string' }],
        },
        labels: ConfigLabels,
        menuToggle: { type: 'boolean' },
        nativeScrollbars: { type: 'boolean' },
        noAutoAuth: { type: 'boolean' },
        onDeepLinkClick: { type: 'object' },
        pagination: { enum: ['none', 'section', 'item'] },
        pathInMiddlePanel: { type: 'boolean' },
        payloadSampleIdx: { type: 'number', minimum: 0 },
        requestInterceptor: { type: 'object' },
        requiredPropsFirst: { type: 'boolean' },
        routingStrategy: { type: 'string' },
        samplesTabsMaxCount: { type: 'number' },
        schemaExpansionLevel: {
            oneOf: [{ type: 'number', minimum: 0 }, { type: 'string' }],
        },
        minCharacterLengthToInitSearch: { type: 'number', minimum: 1 },
        maxResponseHeadersToShowInTryIt: { type: 'number', minimum: 0 },
        scrollYOffset: {
            oneOf: [{ type: 'number' }, { type: 'string' }],
        },
        searchAutoExpand: { type: 'boolean' },
        searchFieldLevelBoost: { type: 'number', minimum: 0 },
        searchMaxDepth: { type: 'number', minimum: 1 },
        searchMode: { type: 'string', enum: ['default', 'path-only'] },
        searchOperationTitleBoost: { type: 'number' },
        searchTagTitleBoost: { type: 'number' },
        sendXUserAgentInTryIt: { type: 'boolean' },
        showChangeLayoutButton: { type: 'boolean' },
        showConsole: { type: 'boolean' },
        showNextButton: { type: 'boolean' },
        showRightPanelToggle: { type: 'boolean' },
        showSecuritySchemeType: { type: 'boolean' },
        showWebhookVerb: { type: 'boolean' },
        showObjectSchemaExamples: { type: 'boolean' },
        disableTryItRequestUrlEncoding: { type: 'boolean' },
        sidebarLinks: ConfigSidebarLinks,
        sideNavStyle: { type: 'string', enum: ['summary-only', 'path-first', 'id-only', 'path-only'] },
        simpleOneOfTypeLabel: { type: 'boolean' },
        sortEnumValuesAlphabetically: { type: 'boolean' },
        sortOperationsAlphabetically: { type: 'boolean' },
        sortPropsAlphabetically: { type: 'boolean' },
        sortTagsAlphabetically: { type: 'boolean' },
        suppressWarnings: { type: 'boolean' },
        unstable_externalDescription: { type: 'boolean' },
        unstable_ignoreMimeParameters: { type: 'boolean' },
        untrustedDefinition: { type: 'boolean' },
        showAccessMode: { type: 'boolean' },
        preserveOriginalExtensionsName: { type: 'boolean' },
        markdownHeadingsAnchorLevel: { type: 'number' },
    },
    additionalProperties: false,
};
function pickObjectProps(object, keys) {
    return Object.fromEntries(keys.filter((key) => key in object).map((key) => [key, object[key]]));
}
function omitObjectProps(object, keys) {
    return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}
//# sourceMappingURL=reference-docs-config-schema.js.map