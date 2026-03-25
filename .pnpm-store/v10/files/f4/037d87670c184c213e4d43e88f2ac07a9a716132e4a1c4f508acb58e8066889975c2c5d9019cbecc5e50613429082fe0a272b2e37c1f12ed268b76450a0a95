export declare const SPECIAL_TOKENS_ATTRIBUTES: readonly ["bos_token", "eos_token", "unk_token", "sep_token", "pad_token", "cls_token", "mask_token"];
/**
 * Public interface for a tokenizer's special tokens mapping
 */
export interface AddedToken {
    __type: "AddedToken";
    content?: string;
    lstrip?: boolean;
    normalized?: boolean;
    rstrip?: boolean;
    single_word?: boolean;
}
export type SpecialTokensMap = {
    [key in (typeof SPECIAL_TOKENS_ATTRIBUTES)[number]]?: string | AddedToken | null;
};
/**
 * Public interface for tokenizer config
 */
export interface TokenizerConfig extends SpecialTokensMap {
    use_default_system_prompt?: boolean;
    chat_template?: string | Array<{
        name: string;
        template: string;
    }>;
}
//# sourceMappingURL=tokenizer-data.d.ts.map