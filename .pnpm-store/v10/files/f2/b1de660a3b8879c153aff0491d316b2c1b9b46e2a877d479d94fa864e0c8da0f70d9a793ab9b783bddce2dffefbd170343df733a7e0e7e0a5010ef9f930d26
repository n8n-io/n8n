export function encodePointer(p: string): string {
  return encodeURI(escapePointer(p));
}

export function escapePointer(p: string): string {
  return p.replace(/~/g, '~0').replace(/\//g, '~1');
}
