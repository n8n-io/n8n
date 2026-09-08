rule threat_process_injection_dll
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects DLL injection and process injection techniques"
        identifies = "threat.process.injection.dll"
        severity = "high"
        mitre_tactics = "defense-evasion"
        specificity = "medium"
        sophistication = "high"

        max_hits = 5
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Windows API injection chain (need 2+ to indicate actual injection)
        $win_writeprocessmemory = "WriteProcessMemory" nocase
        $win_createremotethread = "CreateRemoteThread" nocase
        $win_virtualalloc = "VirtualAllocEx" nocase
        $win_ntcreatethreadex = "NtCreateThreadEx" nocase

        // DLL proxy execution via shell
        $dll_rundll32 = /\brundll32\s+/ nocase
        $dll_regsvr32 = /\bregsvr32\s+/ nocase
        $dll_mshta = /\bmshta\s+/ nocase

        // Python ctypes injection pattern (loading + calling into foreign process)
        $py_ctypes_windll = "ctypes.windll.kernel32" nocase

    condition:
        2 of ($win_*) or
        any of ($dll_rundll32, $dll_regsvr32, $dll_mshta) or
        // ctypes kernel32 only counts when paired with an injection API (alone it
        // serves many benign calls like OpenProcess/LocalFree)
        ($py_ctypes_windll and 1 of ($win_*))
}
