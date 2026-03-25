import type CJSImportProcessor from "../CJSImportProcessor";
import type { Options } from "../index";
import type TokenProcessor from "../TokenProcessor";
import type RootTransformer from "./RootTransformer";
import Transformer from "./Transformer";
/**
 * Implementation of babel-plugin-transform-react-display-name, which adds a
 * display name to usages of React.createClass and createReactClass.
 */
export default class ReactDisplayNameTransformer extends Transformer {
    readonly rootTransformer: RootTransformer;
    readonly tokens: TokenProcessor;
    readonly importProcessor: CJSImportProcessor | null;
    readonly options: Options;
    constructor(rootTransformer: RootTransformer, tokens: TokenProcessor, importProcessor: CJSImportProcessor | null, options: Options);
    process(): boolean;
    /**
     * This is called with the token position at the open-paren.
     */
    private tryProcessCreateClassCall;
    private findDisplayName;
    private getDisplayNameFromFilename;
    /**
     * We only want to add a display name when this is a function call containing
     * one argument, which is an object literal without `displayName` as an
     * existing key.
     */
    private classNeedsDisplayName;
}
