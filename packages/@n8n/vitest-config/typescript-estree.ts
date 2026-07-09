/**
 * Re-export of `@typescript-eslint/typescript-estree` resolved against this
 * package's own `typescript` dependency (the 6.x JS line). typescript-estree
 * requires the TypeScript JS API at runtime, which the TypeScript 7 native
 * compiler no longer ships — tests in TS7 packages import estree through here
 * so it binds to a working TypeScript instead of their local 7.x.
 */
export * from '@typescript-eslint/typescript-estree';
