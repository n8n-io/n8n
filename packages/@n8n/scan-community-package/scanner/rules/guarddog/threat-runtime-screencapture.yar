rule threat_runtime_system_capture
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects screenshot capture of the user's display"
        identifies = "threat.runtime.screencapture"
        severity = "medium"
        mitre_tactics = "collection"
        specificity = "high"
        sophistication = "low"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth"

    strings:
        // Python - PIL ImageGrab
        $py_imagegrab = /\bImageGrab\s*\.\s*grab\s*\(/ nocase
        $py_pil_imagegrab = /\bPIL\s*\.\s*ImageGrab\s*\.\s*grab\s*\(/ nocase

        // Python - pyscreenshot library
        $py_pyscreenshot = /\bpyscreenshot\s*\.\s*grab\s*\(/ nocase

        // Python - pyautogui library
        $py_pyautogui = /\bpyautogui\s*\.\s*screenshot\s*\(/ nocase

        // Python - mss library
        $py_mss_grab = /\bmss\s*\.\s*mss\s*\(\s*\)\s*\.\s*grab\s*\(/ nocase
        $py_mss_with = /\bwith\s+\bmss\s*\.\s*mss\s*\(\s*\)\s+\bas\b/ nocase

        // Python - D3DShot (Windows DirectX screenshots)
        $py_d3dshot = /\bd3dshot\s*\.\s*create\s*\([^)]*\)\s*\.\s*screenshot\s*\(/ nocase

    condition:
        any of them
}
