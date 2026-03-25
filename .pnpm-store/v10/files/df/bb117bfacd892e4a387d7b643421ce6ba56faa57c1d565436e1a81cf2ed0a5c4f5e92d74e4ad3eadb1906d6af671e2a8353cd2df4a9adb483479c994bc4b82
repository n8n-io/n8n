export class CCError extends Error {}

export const UTF8encoder = new TextEncoder();

// Note: !has() will lead to type errors
// TODO: replace with Object.hasOwn() once Node 16 is EOL'd on 2023-09-11
export function has<T, K extends PropertyKey>(
  obj: T,
  prop: K,
): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

// Node.js 14 doesn't have btoa() and later Node.js versions deprecated it
export function btoa(str: string) {
  if (typeof window === "undefined" || !window.btoa) {
    return Buffer.from(str, "utf8").toString("base64");
  } else {
    return window.btoa(str);
  }
}

export function isInt(s: string): boolean {
  return /^\s*[+-]?\d+$/.test(s);
}
