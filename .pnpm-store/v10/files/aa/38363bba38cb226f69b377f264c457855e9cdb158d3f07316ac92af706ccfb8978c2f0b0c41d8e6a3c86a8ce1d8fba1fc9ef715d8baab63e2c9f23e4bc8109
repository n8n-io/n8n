let cachedDebuggerEnabled;

/**
 * Was the debugger enabled when this function was first called?
 */
async function isDebuggerEnabled() {
  if (cachedDebuggerEnabled === undefined) {
    try {
      // Node can be built without inspector support
      const inspector = await import('node:inspector');
      cachedDebuggerEnabled = !!inspector.url();
    } catch {
      cachedDebuggerEnabled = false;
    }
  }

  return cachedDebuggerEnabled;
}

export { isDebuggerEnabled };
//# sourceMappingURL=debug.js.map
