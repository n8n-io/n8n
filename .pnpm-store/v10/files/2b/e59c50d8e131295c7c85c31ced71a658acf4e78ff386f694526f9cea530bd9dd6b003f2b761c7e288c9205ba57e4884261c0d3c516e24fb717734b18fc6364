import StyleSheet from '../sheet';
import { ExecutionContext, RuleSet, Stringifier } from '../types';
/**
 * ComponentStyle is all the CSS-specific stuff, not the React-specific stuff.
 */
export default class ComponentStyle {
    baseHash: number;
    baseStyle: ComponentStyle | null | undefined;
    componentId: string;
    isStatic: boolean;
    rules: RuleSet<any>;
    staticRulesId: string;
    constructor(rules: RuleSet<any>, componentId: string, baseStyle?: ComponentStyle | undefined);
    generateAndInjectStyles(executionContext: ExecutionContext, styleSheet: StyleSheet, stylis: Stringifier): {
        className: string;
        css: string;
    };
}
