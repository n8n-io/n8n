import { deepCopy, jsonParse } from 'n8n-workflow';
export async function handleMessage(context, options) {
    // No message in the context
    if (!context.message) {
        return null;
    }
    // ignore duplicate message check, don't think it's necessary, but it was in the rhea-lib example code
    if (context.message.message_id && context.message.message_id === options.lastMessageId) {
        return null;
    }
    let data = context.message;
    if (options.jsonConvertByteArrayToString === true && data.body.content !== undefined) {
        // The buffer is not ready... Stringify and parse back to load it.
        const cont = deepCopy(data.body.content);
        data.body = String.fromCharCode.apply(null, cont.data);
    }
    if (options.jsonConvertByteArrayToString === true && data.body.content !== undefined) {
        // The buffer is not ready... Stringify and parse back to load it.
        const content = deepCopy(data.body.content);
        data.body = String.fromCharCode.apply(null, content.data);
    }
    if (options.jsonParseBody === true) {
        data.body = jsonParse(data.body);
    }
    if (options.onlyBody === true) {
        data = data.body;
    }
    let responsePromise = undefined;
    if (!options.parallelProcessing) {
        responsePromise = this.helpers.createDeferredPromise();
    }
    if (responsePromise) {
        this.emit([this.helpers.returnJsonArray([data])], undefined, responsePromise);
        await responsePromise.promise;
    }
    else {
        this.emit([this.helpers.returnJsonArray([data])]);
    }
    return { messageId: context.message.message_id };
}
//# sourceMappingURL=handleMessage.js.map