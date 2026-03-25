export function encodePointer(p) {
    return encodeURI(escapePointer(p));
}
export function escapePointer(p) {
    return p.replace(/~/g, '~0').replace(/\//g, '~1');
}
