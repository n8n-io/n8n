rule threat_runtime_obfuscation_api
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects advanced API call obfuscation using introspection and reflection techniques"
        identifies = "threat.runtime.obfuscation.api"
        severity = "medium"
        mitre_tactics = "defense-evasion"
        specificity = "high"
        sophistication = "medium"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go"
    strings:
        // getattr that fetches AND immediately calls a dangerous builtin, e.g.
        // getattr(o, "exec")(...). The trailing call excludes assign-only shims.
        $py_getattr_exec = /\bgetattr\s*\([^,]+,\s*['"](__import__|exec|eval|compile)['"]\s*\)\s*\(/ nocase
        // getattr on __builtins__ whose result is immediately invoked
        $py_builtins_getattr = /\bgetattr\s*\(\s*__builtins__\s*,[^)]*\)\s*\(/ nocase

        // JS reflection where the resolved descriptor .value is then invoked
        $js_get_own_prop_desc = /\bObject\s*\.\s*getOwnPropertyDescriptor\s*\([^)]+,\s*[^)]+\)\s*\.\s*\bvalue\b\s*\(/ nocase
        $js_get_own_prop_names = /\[\s*\bObject\s*\.\s*getOwnPropertyNames\s*\([^)]+\)\s*\.\s*\bfind\s*\(/ nocase
        $js_object_keys_find = /\[\s*\bObject\s*\.\s*\bkeys\s*\([^)]+\)\s*\.\s*\bfind\s*\(/ nocase
        $js_entries_find = /\bObject\s*\.\s*\bentries\s*\([^)]+\)\s*\.\s*\bfind\s*\([^)]+\)\s*\[\s*1\s*\]/ nocase
        $js_entries_filter = /\bObject\s*\.\s*\bentries\s*\([^)]+\)\s*\.\s*\bfilter\s*\([^)]+\)\s*\[\s*0\s*\]\s*\[\s*1\s*\]/ nocase

    condition:
        any of them
}
