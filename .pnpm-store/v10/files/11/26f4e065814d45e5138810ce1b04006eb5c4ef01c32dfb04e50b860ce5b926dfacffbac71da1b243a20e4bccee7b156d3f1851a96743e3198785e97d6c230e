export const wrapCompilerAsTypeGuard = (compiler) => (schema, ...compilingOptions) => {
    const validator = compiler(schema, ...compilingOptions);
    return (data, ...validationOptions) => validator(data, ...validationOptions);
};
