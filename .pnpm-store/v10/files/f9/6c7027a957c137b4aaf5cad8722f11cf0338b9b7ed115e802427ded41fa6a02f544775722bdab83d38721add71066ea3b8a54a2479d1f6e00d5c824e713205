export function useKbd() {
  return {
    ALT: 'Alt',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    ARROW_UP: 'ArrowUp',
    BACKSPACE: 'Backspace',
    CAPS_LOCK: 'CapsLock',
    CONTROL: 'Control',
    DELETE: 'Delete',
    END: 'End',
    ENTER: 'Enter',
    ESCAPE: 'Escape',
    F1: 'F1',
    F10: 'F10',
    F11: 'F11',
    F12: 'F12',
    F2: 'F2',
    F3: 'F3',
    F4: 'F4',
    F5: 'F5',
    F6: 'F6',
    F7: 'F7',
    F8: 'F8',
    F9: 'F9',
    HOME: 'Home',
    META: 'Meta',
    PAGE_DOWN: 'PageDown',
    PAGE_UP: 'PageUp',
    SHIFT: 'Shift',
    SPACE: ' ',
    TAB: 'Tab',
    CTRL: 'Control',
    ASTERISK: '*',
    SPACE_CODE: 'Space',
  }
}

/**
 * A wrapper around the internal kbd object to make it easier to use in tests
 * which require the key names to be wrapped in curly braces.
 */
export type KbdKeys = keyof ReturnType<typeof useKbd>

export function useTestKbd() {
  const kbd = useKbd()

  const initTestKbd: Record<KbdKeys, string> = Object.entries(kbd).reduce((acc, [key, value]) => {
    acc[key as KbdKeys] = `{${value}}`
    return acc
  }, {} as Record<KbdKeys, string>)

  return {
    ...initTestKbd,
    SHIFT_TAB: `{Shift>}{${kbd.TAB}}`,
  }
}
