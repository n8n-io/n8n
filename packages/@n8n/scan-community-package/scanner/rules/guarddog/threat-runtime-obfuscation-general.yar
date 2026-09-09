rule threat_runtime_obfuscation_general
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects heavy code obfuscation techniques"
        identifies = "threat.runtime.obfuscation.general"
        severity = "medium"
        mitre_tactics = "defense-evasion"
        specificity = "medium"
        sophistication = "medium"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Python - 50+ consecutive hex escapes (crypto test vectors are shorter)
        $py_hex_chr = /\\x[0-9a-fA-F]{2}(\\x[0-9a-fA-F]{2}){49,}/ nocase
        // Python - 50+ consecutive octal escapes
        $py_octal = /\\[0-7]{3}(\\[0-7]{3}){49,}/ nocase

        // JavaScript - JSFuck
        $js_jsfuck = /\[\s*!\s*!\s*\[\s*\]\s*\]/ nocase
        // JavaScript - packer pattern
        $js_packer = /\beval\s*\(\s*\bfunction\s*\([a-z],\s*[a-z],\s*[a-z],\s*[a-z]/ nocase
        // JavaScript - fromCharCode over a long list of numeric literals (10+
        // char codes indicates obfuscation). Requiring numeric arguments avoids
        // false positives on legitimate long expressions such as
        // String.fromCharCode(...someCall(args)) spread over multiple lines.
        $js_fromcharcode = /\bString\s*\.\s*fromCharCode\s*\(\s*(0x[0-9a-fA-F]+|[0-9]+)(\s*,\s*(0x[0-9a-fA-F]+|[0-9]+)){9,}/ nocase

    condition:
        any of them
}
