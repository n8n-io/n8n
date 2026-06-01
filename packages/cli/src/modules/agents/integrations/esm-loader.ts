/**
 * Dynamic ESM import helper.
 *
 * TypeScript compiles `await import('x')` to `require('x')` when the target
 * module format is CommonJS. This breaks ESM-only packages like `chat` and
 * `@chat-adapter/*` which only export via `"import"` in their package.json.
 *
 * This helper uses `new Function()` to create an `import()` call that
 * TypeScript cannot see or transform, preserving the native ESM import.
 *
 * The `typeof import(...)` type annotations below are necessary to get type
 * safety for the dynamically-loaded modules and are not convertible to
 * `import type` syntax.
 */

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const esmImport = new Function('specifier', 'return import(specifier)') as <T>(
	specifier: string,
) => Promise<T>;

/* eslint-disable @typescript-eslint/consistent-type-imports */

export async function loadChatSdk() {
	return await esmImport<typeof import('chat')>('chat');
}

export async function loadSlackAdapter() {
	return await esmImport<typeof import('@chat-adapter/slack')>('@chat-adapter/slack');
}

export async function loadTelegramAdapter() {
	return await esmImport<typeof import('@chat-adapter/telegram')>('@chat-adapter/telegram');
}

export async function loadLinearAdapter() {
	return await esmImport<typeof import('@chat-adapter/linear')>('@chat-adapter/linear');
}

export async function loadMemoryState() {
	return await esmImport<typeof import('@chat-adapter/state-memory')>('@chat-adapter/state-memory');
}

/* eslint-enable @typescript-eslint/consistent-type-imports */
