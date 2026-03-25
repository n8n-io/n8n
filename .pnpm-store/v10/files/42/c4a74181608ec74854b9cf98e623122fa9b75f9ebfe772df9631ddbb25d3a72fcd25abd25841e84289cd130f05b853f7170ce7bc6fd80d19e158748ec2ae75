export function atee(iter, length = 2) {
    const buffers = Array.from({ length }, () => []);
    return buffers.map(async function* makeIter(buffer) {
        while (true) {
            if (buffer.length === 0) {
                const result = await iter.next();
                for (const buffer of buffers) {
                    buffer.push(result);
                }
            }
            else if (buffer[0].done) {
                return;
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                yield buffer.shift().value;
            }
        }
    });
}
