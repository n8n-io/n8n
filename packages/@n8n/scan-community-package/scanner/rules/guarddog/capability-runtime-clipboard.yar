rule capability_runtime_clipboard
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects clipboard access operations"
        identifies = "capability.runtime.clipboard"
        severity = "low"
        specificity = "low"
        sophistication = "low"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go"
    strings:
        // Python - pyperclip
        $py_pyperclip_paste = "pyperclip.paste()" nocase
        $py_pyperclip_copy = "pyperclip.copy(" nocase
        $py_pandas_clipboard = "pandas.read_clipboard(" nocase
        $py_tkinter = "root.clipboard_get(" nocase

        // JavaScript/Node.js - clipboardy, node-clipboardy
        $js_clipboardy_read = /clipboardy\.(read|readSync)/ nocase
        $js_clipboardy_write = /clipboardy\.(write|writeSync)/ nocase
        $js_electron = "clipboard.readText(" nocase

        // Go - clipboard libraries
        $go_clipboard = "clipboard.ReadAll(" nocase
        $go_clipboard_write = "clipboard.WriteAll(" nocase

    condition:
        any of them
}
