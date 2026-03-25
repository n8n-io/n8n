export function getUnmarshalledStream(source, options) {
    const messageUnmarshaller = getMessageUnmarshaller(options.deserializer, options.toUtf8);
    return {
        [Symbol.asyncIterator]: async function* () {
            for await (const chunk of source) {
                const message = options.eventStreamCodec.decode(chunk);
                const type = await messageUnmarshaller(message);
                if (type === undefined)
                    continue;
                yield type;
            }
        },
    };
}
export function getMessageUnmarshaller(deserializer, toUtf8) {
    return async function (message) {
        const { value: messageType } = message.headers[":message-type"];
        if (messageType === "error") {
            const unmodeledError = new Error(message.headers[":error-message"].value || "UnknownError");
            unmodeledError.name = message.headers[":error-code"].value;
            throw unmodeledError;
        }
        else if (messageType === "exception") {
            const code = message.headers[":exception-type"].value;
            const exception = { [code]: message };
            const deserializedException = await deserializer(exception);
            if (deserializedException.$unknown) {
                const error = new Error(toUtf8(message.body));
                error.name = code;
                throw error;
            }
            throw deserializedException[code];
        }
        else if (messageType === "event") {
            const event = {
                [message.headers[":event-type"].value]: message,
            };
            const deserialized = await deserializer(event);
            if (deserialized.$unknown)
                return;
            return deserialized;
        }
        else {
            throw Error(`Unrecognizable event type: ${message.headers[":event-type"].value}`);
        }
    };
}
