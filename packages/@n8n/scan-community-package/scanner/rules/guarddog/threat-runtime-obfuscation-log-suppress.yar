rule threat_runtime_obfuscation_log_suppress
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects log/console suppression combined with obfuscated code, a common malware evasion pattern"
        identifies = "threat.runtime.obfuscation"
        severity = "medium"
        mitre_tactics = "defense-evasion"
        specificity = "high"
        sophistication = "medium"
        max_hits = 1
        path_include = "*.js,*.ts,*.mjs,*.cjs"

    strings:
        // Console/log suppression (overriding with no-op)
        $suppress_log = /console\.log\s*=\s*function\s*\(\s*\)/ nocase
        $suppress_warn = /console\.warn\s*=\s*function\s*\(\s*\)/ nocase
        $suppress_error = /console\.error\s*=\s*function\s*\(\s*\)/ nocase
        $suppress_all = /console\s*=\s*\{/ nocase

        // Obfuscation indicators (present in same file)
        $hex_array = /\[\s*0x[0-9a-f]+\s*,\s*0x[0-9a-f]+\s*,\s*0x[0-9a-f]+/ nocase
        $fromCodePoint = "fromCodePoint" nocase
        $fromCharCode = "fromCharCode" nocase

    condition:
        any of ($suppress_*) and any of ($hex_array, $fromCodePoint, $fromCharCode)
}
