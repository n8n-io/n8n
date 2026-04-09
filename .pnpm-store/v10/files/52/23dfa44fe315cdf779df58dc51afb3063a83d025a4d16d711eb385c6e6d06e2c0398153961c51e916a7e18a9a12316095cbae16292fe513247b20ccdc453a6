const _WebAssembly = typeof WebAssembly !== 'undefined'
    ? WebAssembly
    : typeof WXWebAssembly !== 'undefined'
        ? WXWebAssembly
        : undefined;
if (!_WebAssembly) {
    throw new Error('WebAssembly is not supported in this environment');
}
export { _WebAssembly };
