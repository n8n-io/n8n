rule threat_runtime_obfuscation_unicode
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects unicode homoglyphs and uncommon characters used for obfuscation"
        identifies = "threat.runtime.obfuscation.unicode"
        severity = "medium"
        mitre_tactics = "defense-evasion"
        specificity = "low"
        sophistication = "medium"

	path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go"
        max_hits = 1
    strings:
        // Homoglyph obfuscation hides a lookalike char inside an ASCII word
        // (e.g. "pаypal" with a Cyrillic 'а'). Match a Cyrillic/Greek/math letter
        // adjacent to an ASCII letter; pure non-ASCII data (charset/i18n tables)
        // has no such boundary.

        // Cyrillic block (U+0400-U+047F) touching an ASCII letter
        $cyr_after_ascii  = /[a-zA-Z][\xd0\xd1][\x80-\xbf]/
        $cyr_before_ascii = /[\xd0\xd1][\x80-\xbf][a-zA-Z]/

        // Greek block (U+0380-U+03FF) touching an ASCII letter
        $grk_after_ascii  = /[a-zA-Z][\xce\xcf][\x80-\xbf]/
        $grk_before_ascii = /[\xce\xcf][\x80-\xbf][a-zA-Z]/

        // Mathematical Alphanumeric Symbols (U+1D400+) touching an ASCII letter
        $math_after_ascii  = /[a-zA-Z]\xf0\x9d[\x80-\xbf][\x80-\xbf]/
        $math_before_ascii = /\xf0\x9d[\x80-\xbf][\x80-\xbf][a-zA-Z]/

        // Zero-width characters wedged between ASCII letters (invisible splitter)
        $zw_between = /[a-zA-Z]\xe2\x80[\x8b-\x8d][a-zA-Z]/

    condition:
        any of them
}
