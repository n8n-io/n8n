export function resolveEventStreamConfig(input) {
    const eventSigner = input.signer;
    const messageSigner = input.signer;
    const newInput = Object.assign(input, {
        eventSigner,
        messageSigner,
    });
    const eventStreamPayloadHandler = newInput.eventStreamPayloadHandlerProvider(newInput);
    return Object.assign(newInput, {
        eventStreamPayloadHandler,
    });
}
