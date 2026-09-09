rule threat_runtime_obfuscation_import_exec
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects dynamic import chains used to obfuscate code execution"
        identifies = "threat.runtime.obfuscation"
        severity = "high"
        mitre_tactics = "defense-evasion"
        specificity = "high"
        sophistication = "medium"
        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth"

    strings:
        // exec(__import__('...')) - dynamic import + exec chain
        $import_exec = /exec\s*\(\s*__import__\s*\(/ nocase
        $import_builtins_exec = /__import__\s*\(\s*['"]builtins['"]\s*\)\s*\.\s*exec\s*\(/ nocase

        // Compressed/encoded exec: exec(zlib.decompress(base64.b64decode(...)))
        $zlib_b64_exec = /exec\s*\(\s*__import__\s*\(\s*['"]zlib['"]\s*\)\s*\.\s*decompress/ nocase
        $zlib_exec = /exec\s*\(\s*zlib\s*\.\s*decompress\s*\(\s*base64/ nocase
        $marshal_exec = /exec\s*\(\s*marshal\s*\.\s*loads\s*\(/ nocase

        // type() constructor abuse for dynamic class/code creation
        $type_exec = /type\s*\(\s*['"]loading['"]\s*\)/ nocase

    condition:
        any of them
}
