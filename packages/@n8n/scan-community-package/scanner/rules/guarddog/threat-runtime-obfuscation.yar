rule threat_runtime_obfuscation
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects heavy obfuscation techniques commonly used by malware"
        identifies = "threat.runtime.obfuscation"
        severity = "low"
        mitre_tactics = "defense-evasion"
        specificity = "medium"
        sophistication = "low"

	path_include = "*.py,*.pyx,*.pyi,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go"
        max_hits = 1
    strings:
        // Base64 patterns (multiple long strings). Require an opening quote and a
        // long run so quoted SDK identifiers, doc links and long URLs (all well
        // under this length) are not counted as base64 payloads.
        $b64_1 = /['"][A-Za-z0-9+\/]{150,}={0,2}/

        // Hex-encoded strings
        $hex_1 = /\\x[0-9a-fA-F]{2}([\\x][0-9a-fA-F]{2}){20,}/

        // Unicode escape sequences
        $unicode_1 = /\\u[0-9a-fA-F]{4}(\\u[0-9a-fA-F]{4}){10,}/

        // Obfuscated variable names (obfuscator.io-style hex identifiers).
        // The previous [A-Z]{10,} branch also matched ALLCAPS words (license
        // text, constants like INTERACTIVE) and was a heavy false-positive source.
        $random_vars = /\b[a-zA-Z]_0x[a-f0-9]{4,6}\b/

        // String concatenation obfuscation
        $concat = /['"]\s*\+\s*['"]/

    condition:
        // One long base64 run is routinely a legitimate inline asset (image,
        // SRI integrity hash, embedded cert); require several before treating it
        // as obfuscation.
        (#b64_1 >= 3) or
        (#hex_1 >= 3) or
        (#random_vars >= 10 and #concat >= 20) or
        // \uXXXX runs recur in legitimate Unicode/charset tables, so require a
        // second obfuscation signal alongside them
        (#unicode_1 >= 2 and ($b64_1 or #concat >= 5 or #hex_1 >= 1))
}
