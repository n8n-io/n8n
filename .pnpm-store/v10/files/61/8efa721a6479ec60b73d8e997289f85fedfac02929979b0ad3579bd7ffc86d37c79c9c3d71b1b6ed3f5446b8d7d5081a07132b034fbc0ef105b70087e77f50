const isReplit = Boolean(process.env.REPL_SLUG);

export default {
  server: {
    host: '0.0.0.0',

    ...(isReplit
        ? {
          hmr: {
            clientPort: 443,
          },
        }
    : {}),
  }
}
