export function ssecMiddleware(options) {
    return (next) => async (args) => {
        const input = { ...args.input };
        const properties = [
            {
                target: "SSECustomerKey",
                hash: "SSECustomerKeyMD5",
            },
            {
                target: "CopySourceSSECustomerKey",
                hash: "CopySourceSSECustomerKeyMD5",
            },
        ];
        for (const prop of properties) {
            const value = input[prop.target];
            if (value) {
                let valueForHash;
                if (typeof value === "string") {
                    if (isValidBase64EncodedSSECustomerKey(value, options)) {
                        valueForHash = options.base64Decoder(value);
                    }
                    else {
                        valueForHash = options.utf8Decoder(value);
                        input[prop.target] = options.base64Encoder(valueForHash);
                    }
                }
                else {
                    valueForHash = ArrayBuffer.isView(value)
                        ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
                        : new Uint8Array(value);
                    input[prop.target] = options.base64Encoder(valueForHash);
                }
                const hash = new options.md5();
                hash.update(valueForHash);
                input[prop.hash] = options.base64Encoder(await hash.digest());
            }
        }
        return next({
            ...args,
            input,
        });
    };
}
export const ssecMiddlewareOptions = {
    name: "ssecMiddleware",
    step: "initialize",
    tags: ["SSE"],
    override: true,
};
export const getSsecPlugin = (config) => ({
    applyToStack: (clientStack) => {
        clientStack.add(ssecMiddleware(config), ssecMiddlewareOptions);
    },
});
export function isValidBase64EncodedSSECustomerKey(str, options) {
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (!base64Regex.test(str))
        return false;
    try {
        const decodedBytes = options.base64Decoder(str);
        return decodedBytes.length === 32;
    }
    catch {
        return false;
    }
}
