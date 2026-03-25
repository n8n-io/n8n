import { InlayHintInfo } from '../inlayHints';
import type { ScriptCodegenOptions } from './index';
export interface HelperType {
    name: string;
    used?: boolean;
    generated?: boolean;
    code: string;
}
export type ScriptCodegenContext = ReturnType<typeof createScriptCodegenContext>;
export declare function createScriptCodegenContext(options: ScriptCodegenOptions): {
    generatedTemplate: boolean;
    generatedPropsType: boolean;
    bypassDefineComponent: boolean;
    bindingNames: Set<string>;
    localTypes: {
        generate: (names: string[]) => Generator<string, void, unknown>;
        getUsedNames(): Set<string>;
        readonly PrettifyLocal: string;
        readonly OmitKeepDiscriminatedUnion: string;
        readonly WithDefaults: string;
        readonly WithSlots: string;
        readonly PropsChildren: string;
        readonly TypePropsToOption: string;
        readonly OmitIndexSignature: string;
    };
    inlayHints: InlayHintInfo[];
};
