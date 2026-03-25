/**
 * This simulates what something like `tsx` (https://github.com/privatenumber/tsx)
 * will do: it will try to resolve a URL with a `.js` extension to a `.ts` extension.
 *
 * Combined with the test case in the adjacent `multiple-loaders.test.mjs` file,
 * this forces `import-in-the-middle` into what used to be a failure state: where
 * `context.parentURL` is a `node:*` specifier and the `specifier` refers to a file
 * that does not exist.
 *
 * See https://github.com/nodejs/node/issues/52987 for more details.
 */
export async function resolve (specifier, context, defaultResolve) {
  if (!specifier.endsWith('.js') && !specifier.endsWith('.mjs')) {
    return await defaultResolve(specifier, context)
  }

  try {
    return await defaultResolve(specifier.replace(/\.m?js/, '.ts'), context)
  } catch (err) {
    if (err.code !== 'ERR_MODULE_NOT_FOUND') {
      throw err
    }

    return await defaultResolve(specifier, context)
  }
}
