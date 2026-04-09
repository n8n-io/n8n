export function safelyAccessDocument(_document?: Document): Document | null {
  return _document || (typeof document !== 'undefined' ? document : null)
}

export function safelyAccessDocumentEvent(event: Event): Document | null {
  return !!event &&
    !!event.target &&
    typeof event.target === 'object' &&
    'ownerDocument' in event.target
    ? (event.target.ownerDocument as Document | null)
    : null
}
