// Shim for performance.now() to support environments that don't have it:
export function now(): number {
  return globalThis?.performance?.now() ?? Date.now();
}
