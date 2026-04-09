import * as _storybook_core_types from '@storybook/core/types';
import { StrictArgTypes, Renderer, StoryContextForEnhancers, Options } from '@storybook/core/types';

type Component = any;

interface JsDocParam {
    name: string | undefined | null;
    description?: string | null;
}
interface JsDocReturns {
    description?: string | null;
}
interface JsDocTags {
    params?: JsDocParam[] | null;
    returns?: JsDocReturns | null;
}
interface PropSummaryValue {
    summary?: string;
    detail?: string;
}
type PropType = PropSummaryValue;
type PropDefaultValue = PropSummaryValue;
interface PropDef {
    name: string;
    type: PropType | null;
    sbType?: any;
    required: boolean;
    description?: string;
    defaultValue?: PropDefaultValue | null;
    jsDocTags?: JsDocTags;
}

type PropsExtractor = (component: Component) => {
    rows?: PropDef[];
} | null;
type ArgTypesExtractor = (component: Component) => StrictArgTypes | null;
interface DocgenType {
    name: string;
    description?: string;
    required?: boolean;
    value?: any;
}
interface DocgenPropType extends DocgenType {
    value?: any;
    raw?: string;
    computed?: boolean;
}
interface DocgenFlowType extends DocgenType {
    type?: string;
    raw?: string;
    signature?: any;
    elements?: any[];
}
interface DocgenTypeScriptType extends DocgenType {
    raw?: string;
}
interface DocgenPropDefaultValue {
    value: string;
    computed?: boolean;
    func?: boolean;
}
interface DocgenInfo {
    type: DocgenPropType;
    flowType?: DocgenFlowType;
    tsType?: DocgenTypeScriptType;
    required: boolean;
    description: string;
    defaultValue: DocgenPropDefaultValue;
}
declare enum TypeSystem {
    JAVASCRIPT = "JavaScript",
    FLOW = "Flow",
    TYPESCRIPT = "TypeScript",
    UNKNOWN = "Unknown"
}

declare const convert: (docgenInfo: DocgenInfo) => any;

declare function isDefaultValueBlacklisted(value: string): boolean;

declare const str: (obj: any) => string;

declare function hasDocgen<T = any>(component: Component): component is object & {
    __docgenInfo: T;
};
declare function isValidDocgenSection(docgenSection: any): boolean;
declare function getDocgenSection(component: Component, section: string): any;
declare function getDocgenDescription(component: Component): string;

interface ExtractedJsDocParam extends JsDocParam {
    type?: any;
    getPrettyName: () => string | undefined;
    getTypeName: () => string | null;
}
interface ExtractedJsDocReturns extends JsDocReturns {
    type?: any;
    getTypeName: () => string | null;
}
interface ExtractedJsDoc {
    params?: ExtractedJsDocParam[] | null;
    deprecated?: string | null;
    returns?: ExtractedJsDocReturns | null;
    ignore: boolean;
}
interface JsDocParsingOptions {
    tags?: string[];
}
interface JsDocParsingResult {
    includesJsDoc: boolean;
    ignore: boolean;
    description?: string;
    extractedTags?: ExtractedJsDoc;
}
type ParseJsDoc = (value: string | null, options?: JsDocParsingOptions) => JsDocParsingResult;
declare const parseJsDoc: ParseJsDoc;

interface ExtractedProp {
    propDef: PropDef;
    docgenInfo: DocgenInfo;
    jsDocTags?: ExtractedJsDoc;
    typeSystem: TypeSystem;
}
type ExtractProps = (component: Component, section: string) => ExtractedProp[];
declare const extractComponentSectionArray: (docgenSection: any) => any;
declare const extractComponentSectionObject: (docgenSection: any) => (ExtractedProp | null)[];
declare const extractComponentProps: ExtractProps;
declare function extractComponentDescription(component?: Component): string;

declare const MAX_TYPE_SUMMARY_LENGTH = 90;
declare const MAX_DEFAULT_VALUE_SUMMARY_LENGTH = 50;
declare function isTooLongForTypeSummary(value: string): boolean;
declare function isTooLongForDefaultValueSummary(value: string): boolean;
declare function createSummaryValue(summary?: string, detail?: string): PropSummaryValue;
declare const normalizeNewlines: (string: string) => string;

declare const enhanceArgTypes: <TRenderer extends Renderer>(context: StoryContextForEnhancers<TRenderer>) => _storybook_core_types.StrictArgTypes<_storybook_core_types.Args>;

declare const ADDON_ID = "storybook/docs";
declare const PANEL_ID = "storybook/docs/panel";
declare const PARAM_KEY = "docs";
declare const SNIPPET_RENDERED = "storybook/docs/snippet-rendered";
declare enum SourceType {
    /**
     * AUTO is the default
     *
     * Use the CODE logic if:
     *
     * - The user has set a custom source snippet in `docs.source.code` story parameter
     * - The story is not an args-based story
     *
     * Use the DYNAMIC rendered snippet if the story is an args story
     */
    AUTO = "auto",
    /** Render the code extracted by source-loader */
    CODE = "code",
    /** Render dynamically-rendered source snippet from the story's virtual DOM (currently React only) */
    DYNAMIC = "dynamic"
}

declare const hasDocsOrControls: (options: Options) => boolean | undefined;

export { ADDON_ID, type ArgTypesExtractor, type Component, type DocgenFlowType, type DocgenInfo, type DocgenPropDefaultValue, type DocgenPropType, type DocgenType, type DocgenTypeScriptType, type ExtractProps, type ExtractedJsDoc, type ExtractedJsDocParam, type ExtractedJsDocReturns, type ExtractedProp, type JsDocParam, type JsDocParsingOptions, type JsDocParsingResult, type JsDocReturns, type JsDocTags, MAX_DEFAULT_VALUE_SUMMARY_LENGTH, MAX_TYPE_SUMMARY_LENGTH, PANEL_ID, PARAM_KEY, type ParseJsDoc, type PropDef, type PropDefaultValue, type PropSummaryValue, type PropType, type PropsExtractor, SNIPPET_RENDERED, SourceType, TypeSystem, convert, createSummaryValue, enhanceArgTypes, extractComponentDescription, extractComponentProps, extractComponentSectionArray, extractComponentSectionObject, getDocgenDescription, getDocgenSection, hasDocgen, hasDocsOrControls, isDefaultValueBlacklisted, isTooLongForDefaultValueSummary, isTooLongForTypeSummary, isValidDocgenSection, normalizeNewlines, parseJsDoc, str };
