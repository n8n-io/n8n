declare module 'is-emoji-supported' {
  interface TCache {
    has(unicode: string): boolean;
    get(unicode: string): boolean;
    set(unicode: string, supported: boolean): void;
  }

  export function isEmojiSupported(unicode: string): boolean;
  export function setCacheHandler(cache: TCache): void;
}
