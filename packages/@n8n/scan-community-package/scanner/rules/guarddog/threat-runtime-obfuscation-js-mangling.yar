rule threat_runtime_obfuscation_js_mangling
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects JavaScript variable name mangling (_0x pattern) used by obfuscation tools"
        identifies = "threat.runtime.obfuscation.js.mangling"
        severity = "medium"
        mitre_tactics = "defense-evasion"
        specificity = "high"
        sophistication = "medium"
        max_hits = 1
        path_include = "*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"
        path_exclude = "dist/*,build/*,vendor/*,node_modules/*"

    strings:
        // _0x hex variable names (ASCII encoding)
        $hex_var_1 = /_0x[a-f0-9]{4,6}\b/
        $hex_var_2 = /const _0x[a-f0-9]{4,6}\s*=/
        $hex_var_3 = /function _0x[a-f0-9]{4,6}\s*\(/
        $hex_var_4 = /var _0x[a-f0-9]{4,6}\s*=/

        // UTF-16LE encoded _0x patterns (null bytes between ASCII chars)
        $utf16_hex_var = { 5F 00 30 00 78 00 [2-12] 3D 00 }  // _0x...=
        $utf16_function = { 66 00 75 00 6E 00 63 00 74 00 69 00 6F 00 6E 00 20 00 5F 00 30 00 78 00 }  // function _0x

    condition:
        3 of ($hex_var_*) or
        (#utf16_hex_var >= 5) or
        (#utf16_function >= 2)
}
