rule threat_runtime_keylogging
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects keylogging and input capture patterns"
        identifies = "threat.runtime.keylogging"
        severity = "high"
        mitre_tactics = "credential-access"
        specificity = "low"
        sophistication = "medium"
        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Python - keylogging libraries
        $py_pynput_keyboard = "from pynput import keyboard" nocase
        $py_pynput_listener = "keyboard.Listener(" nocase
        $py_pynput_on_press = "on_press" nocase
        $py_keyboard_hook = "keyboard.hook(" nocase
        $py_keyboard_on_press = "keyboard.on_press(" nocase

        // Python - PyHook (Windows keylogging)
        $py_pyhook = "import pyHook" nocase
        $py_hookmanager = "pyHook.HookManager()" nocase

        // Python - evdev (Linux input events)
        $py_evdev = "from evdev import" nocase
        $py_inputdevice = "InputDevice(" nocase
        $py_event_kbd = "ecodes.EV_KEY" nocase

        // Node.js - keylogging libraries
        $js_iohook = "require('iohook')" nocase
        $js_iohook_start = "iohook.start()" nocase
        $js_keypress = "require('keypress')" nocase
        $js_node_key_sender = "node-key-sender" nocase
        $js_node_global_key = "node-global-key-listener" nocase

        // Python - X11 input monitoring (Linux)
        $py_xlib = "from Xlib import" nocase
        $py_xlib_display = "display.Display()" nocase
        $py_record_context = "record.create_context(" nocase

        // Suspicious patterns - logging keystrokes (require function-like context)
        $log_keystroke = /log_?key(stroke|press)/i nocase
        $steal_password = /(steal|grab|exfiltrate).*(password|credential|passwd)/i nocase

        // Hook installation patterns
        $hook_keyboard = "hook_keyboard" nocase
        $set_hook = "SetWindowsHookEx" nocase

        // Combination: listener + file write
        $py_file_write = "write(" nocase
        $py_file_append = "append(" nocase
        $js_fs_write = "fs.writeFile(" nocase
        $js_fs_append = "fs.appendFile(" nocase

    condition:
        // Python keylogging libraries. Require an actual capture call, not a bare
        // `import keyboard` (the keyboard lib has legitimate hotkey uses).
        (($py_pynput_keyboard or $py_pynput_listener) and $py_pynput_on_press) or
        (any of ($py_keyboard_hook, $py_keyboard_on_press)) or
        (any of ($py_pyhook, $py_hookmanager)) or
        (any of ($py_evdev, $py_inputdevice) and $py_event_kbd) or
        (any of ($py_xlib, $py_xlib_display) and $py_record_context) or

        // Node.js keylogging libraries
        (any of ($js_iohook, $js_iohook_start)) or
        any of ($js_keypress, $js_node_key_sender, $js_node_global_key) or

        // Suspicious logging patterns
        any of ($log_keystroke, $steal_password) or

        // Hook patterns
        any of ($hook_keyboard, $set_hook) or

        // Combination: keyboard listener + file write (very suspicious)
        ((any of ($py_pynput_keyboard, $py_pynput_listener, $py_keyboard_hook, $py_keyboard_on_press, $js_iohook, $js_keypress)) and
         (any of ($py_file_write, $py_file_append, $js_fs_write, $js_fs_append)))
}
