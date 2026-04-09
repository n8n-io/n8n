export function sourceType(context) {
    if ('languageOptions' in context && context.languageOptions) {
        if ('parserOptions' in context.languageOptions &&
            context.languageOptions.parserOptions?.sourceType) {
            return context.languageOptions.parserOptions.sourceType;
        }
        if ('sourceType' in context.languageOptions &&
            context.languageOptions.sourceType) {
            return context.languageOptions.sourceType;
        }
    }
    if ('parserOptions' in context && context.parserOptions) {
        return context.parserOptions.sourceType;
    }
}
//# sourceMappingURL=source-type.js.map