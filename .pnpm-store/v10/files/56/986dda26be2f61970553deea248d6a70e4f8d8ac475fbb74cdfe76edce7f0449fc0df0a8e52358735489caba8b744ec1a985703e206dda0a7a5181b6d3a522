import type { Type, TypeChecker } from 'typescript';
import type { TypeOrValueSpecifier } from '../util';
import { isTypeAnyType, isTypeNeverType } from '../util';
type OptionTester = (type: Type, checker: TypeChecker, recursivelyCheckType: (type: Type) => boolean) => boolean;
declare const optionTesters: {
    type: "Array" | "RegExp" | "Boolean" | "Number" | "Any" | "Nullish" | "Never";
    option: "allowAny" | "allowBoolean" | "allowNullish" | "allowRegExp" | "allowNever" | "allowNumber" | "allowArray";
    tester: typeof isTypeAnyType | typeof isTypeNeverType | OptionTester | ((type: Type, checker: TypeChecker, recursivelyCheckType: (type: Type) => boolean) => boolean) | ((type: Type, checker: TypeChecker) => boolean);
}[];
export type Options = [
    {
        allow?: TypeOrValueSpecifier[];
    } & Partial<Record<(typeof optionTesters)[number]['option'], boolean>>
];
export type MessageId = 'invalidType';
declare const _default: import("@typescript-eslint/utils/ts-eslint").RuleModule<"invalidType", Options, import("../../rules").ESLintPluginDocs, import("@typescript-eslint/utils/ts-eslint").RuleListener>;
export default _default;
//# sourceMappingURL=restrict-template-expressions.d.ts.map