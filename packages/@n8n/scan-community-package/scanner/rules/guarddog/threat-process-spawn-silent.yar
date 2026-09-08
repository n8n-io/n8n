rule threat_process_spawn_silent
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects fully silent process execution (suppressing all output channels)"
        identifies = "threat.process.spawn.silent"
        severity = "low"
        mitre_tactics = "defense-evasion"
        specificity = "low"
        sophistication = "medium"

        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go"

    strings:
        // Python - require BOTH stdout AND stderr suppressed (full silencing)
        $py_stdout_devnull = "stdout=subprocess.DEVNULL" nocase
        $py_stderr_devnull = "stderr=subprocess.DEVNULL" nocase

        // JavaScript/Node.js - detached + stdio ignore (intent to hide)
        $js_detached = /"?detached"?[\s]*:[\s]*true/ nocase
        $js_stdio_ignore = /"?stdio"?[\s]*:[\s]*('|")ignore/ nocase
        $js_stdio_arr_ignore = /"?stdio"?[\s]*:[\s]*\[[\s]*('|")ignore/ nocase
        $js_windowshide = /"?windowsHide"?[\s]*:[\s]*true/ nocase

        // Go - detached/hidden processes
        $go_hidewindow = "syscall.CREATE_NO_WINDOW" nocase

    condition:
        // Python: both stdout AND stderr devnulled
        ($py_stdout_devnull and $py_stderr_devnull) or
        // JS: detached + stdio suppressed or windows hidden
        ($js_detached and (any of ($js_stdio_*, $js_windowshide))) or
        // Go: explicit window hiding
        $go_hidewindow
}
