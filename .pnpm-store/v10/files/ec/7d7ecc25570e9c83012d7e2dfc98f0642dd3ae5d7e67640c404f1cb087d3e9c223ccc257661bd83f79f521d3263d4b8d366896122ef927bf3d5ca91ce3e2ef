export async function toArrayAsync(it) {
    const arr = [];
    for await (const o of it) {
        arr.push(o);
    }
    return arr;
}
export async function takeResult(it) {
    for await (const o of it) {
        if (o.type === 'result') {
            return o.result;
        }
        else if (o.type === 'error') {
            throw o.error;
        }
    }
    throw new Error('No result in stream.');
}
//# sourceMappingURL=responseMessage.js.map