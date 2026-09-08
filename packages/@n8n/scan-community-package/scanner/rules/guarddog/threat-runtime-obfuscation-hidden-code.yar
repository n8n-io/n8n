rule threat_runtime_obfuscation_hidden_code
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects a payload hidden by excessive whitespace or require aliased through a global to evade static analysis"
        identifies = "threat.runtime.obfuscation"
        severity = "high"
        mitre_tactics = "defense-evasion"
        specificity = "high"
        sophistication = "high"
        max_hits = 1
        path_include = "*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // require aliased through a global bracket assignment, used to dodge static
        // require() detection (react-native-aria / Shai-Hulud injected payloads)
        $global_require = /global\s*\[\s*['"][A-Za-z0-9_$]{1,6}['"]\s*\]\s*=\s*require\b/ nocase

        // a long run of spaces pushing a payload far off-screen
        $ws_hidden = /[ ]{400,}\S/

        // execution sinks that, after a whitespace gap, signal the hidden payload
        $eval = /\beval\s*\(/ nocase
        $new_function = /\bnew\s+Function\s*\(/ nocase

    condition:
        $global_require or
        ($ws_hidden and any of ($eval, $new_function))
}
