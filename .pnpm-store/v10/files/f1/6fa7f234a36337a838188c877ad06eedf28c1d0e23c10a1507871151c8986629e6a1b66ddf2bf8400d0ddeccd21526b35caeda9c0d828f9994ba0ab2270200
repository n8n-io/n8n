export function getActiveElement(): Element | null {
  let activeElement = document.activeElement
  if (activeElement == null) {
    return null
  }

  while (activeElement != null && activeElement.shadowRoot != null && activeElement.shadowRoot.activeElement != null) {
    activeElement = activeElement.shadowRoot.activeElement
  }

  return activeElement
}
