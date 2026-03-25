export class CCError extends Error {
}
export const UTF8encoder = new TextEncoder();
// Note: !has() will lead to type errors
// TODO: replace with Object.hasOwn() once Node 16 is EOL'd on 2023-09-11
export function has(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}
// Node.js 14 doesn't have btoa() and later Node.js versions deprecated it
export function btoa(str) {
    if (typeof window === "undefined" || !window.btoa) {
        return Buffer.from(str, "utf8").toString("base64");
    }
    else {
        return window.btoa(str);
    }
}
export function isInt(s) {
    return /^\s*[+-]?\d+$/.test(s);
}
//# sourceMappingURL=utils.js.map