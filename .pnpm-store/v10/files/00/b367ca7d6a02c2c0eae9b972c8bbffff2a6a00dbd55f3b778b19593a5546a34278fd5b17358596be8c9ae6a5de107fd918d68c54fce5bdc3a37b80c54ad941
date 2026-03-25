export function makeIterable<T>(iterator: Iterator<T>): IterableIterator<T> {
    iterator[Symbol.iterator] = getSelf
    return iterator as any
}

function getSelf() {
    return this
}
