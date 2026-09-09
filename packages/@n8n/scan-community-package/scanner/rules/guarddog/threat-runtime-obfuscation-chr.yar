rule threat_runtime_obfuscation_chr
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects chr-based code obfuscation: exec/eval of chr() sequences"
        identifies = "threat.runtime.obfuscation"
        severity = "high"
        mitre_tactics = "defense-evasion"
        specificity = "high"
        sophistication = "medium"
        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth"

    strings:
        // exec("".join(map(chr, [...]))) - most common pattern
        $chr_join_exec = /exec\s*\(\s*["']?["']?\s*\.\s*join\s*\(\s*map\s*\(\s*chr\s*,/ nocase
        // eval("".join(map(chr, [...])))
        $chr_join_eval = /eval\s*\(\s*["']?["']?\s*\.\s*join\s*\(\s*map\s*\(\s*chr\s*,/ nocase
        // exec(chr(n)+chr(n)+...) or via list comprehension
        $chr_concat = /exec\s*\(\s*chr\s*\(\d+\)\s*\+/ nocase
        // [chr(n) for n in [...]] pattern
        $chr_listcomp = /\[\s*chr\s*\(\s*\w+\s*\)\s+for\s+\w+\s+in\s+\[/ nocase
        // Hex/octal escape obfuscation in eval: eval("\x65\x76\141...")
        // Matches both actual escape sequences and literal backslash-x in source
        $hex_eval = /eval\s*\(\s*"(\\x[0-9a-fA-F]{2}){5,}/ nocase
        $hex_eval2 = /eval\s*\(\s*'(\\x[0-9a-fA-F]{2}){5,}/ nocase
        $hex_eval3 = /eval\s*\(\s*"(\\[0-7]{3}){5,}/ nocase
        $hex_eval4 = /eval\s*\(\s*'(\\[0-7]{3}){5,}/ nocase

        // Underscore-only variable names used by Python obfuscators
        // 5+ consecutive underscores used as identifiers = obfuscation tool output
        $underscore_vars = /_{5,}\s*=\s*eval\s*\(/ nocase

    condition:
        any of them
}
