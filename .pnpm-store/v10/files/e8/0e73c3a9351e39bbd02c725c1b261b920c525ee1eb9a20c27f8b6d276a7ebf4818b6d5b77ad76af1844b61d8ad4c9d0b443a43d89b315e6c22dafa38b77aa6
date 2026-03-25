// Helper library for browser test scripts

import {EditorView} from "@codemirror/view"
import {EditorState, Extension} from "@codemirror/state"

const workspace: HTMLElement = document.querySelector("#workspace")! as HTMLElement

let currentTempView: EditorView | null = null
let hide: any = null

/// Create a hidden view with the given document and extensions that
/// lives until the next call to `tempView`.
export function tempView(doc = "", extensions: readonly Extension[] = []): EditorView {
  if (currentTempView) {
    currentTempView.destroy()
    currentTempView = null
  }

  currentTempView = new EditorView({state: EditorState.create({doc, extensions})})
  workspace.appendChild(currentTempView.dom)
  workspace.style.pointerEvents = ""
  if (hide == null) hide = setTimeout(() => {
    hide = null
    workspace.style.pointerEvents = "none"
  }, 100)
  return currentTempView
}

/// Focus the given view or raise an error when the window doesn't have focus.
export function requireFocus(cm: EditorView): EditorView {
  if (!document.hasFocus())
    throw new Error("The document doesn't have focus, which is needed for this test")
  cm.focus()
  return cm
}
