rule threat_runtime_obfuscation_base64exec
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects base64 decoding followed by code execution"
        identifies = "threat.runtime.obfuscation.base64exec"
        severity = "high"
        mitre_tactics = "defense-evasion"
        specificity = "medium"
        sophistication = "medium"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go,*.rb,*.gemspec"

    strings:
        // Python - base64 decode + exec/eval
        $py_b64decode = /\bbase64\s*\.\s*b64decode\s*\(/ nocase
        $py_b64decode_alt = /\bbase64\s*\.\s*decodebytes\s*\(/ nocase
        $py_b64decode_std = /\bbase64\s*\.\s*standard_b64decode\s*\(/ nocase
        // bare exec(/eval( builtins, not method calls like model.eval()
        $py_exec = /[^.\w]exec\s*\(/ nocase
        $py_eval = /[^.\w]eval\s*\(/ nocase

        // JavaScript/Node.js - base64 decode patterns
        $js_atob = /\batob\s*\(/ nocase
        // Buffer.from with explicit base64 encoding (not just any Buffer.from)
        $js_buffer_b64 = /Buffer\s*\.\s*from\s*\([^)]*['"]base64['"]/ nocase
        $js_eval = /\beval\s*\(/ nocase
        $js_function = /\bnew\s+Function\s*\(/ nocase

        // Go - base64 decode + exec
        $go_b64decode = /\bbase64\s*\.\s*StdEncoding\s*\.\s*DecodeString\s*\(/ nocase
        $go_b64decode_alt = /\bbase64\s*\.\s*URLEncoding\s*\.\s*DecodeString\s*\(/ nocase
        $go_exec = /\bexec\s*\.\s*Command\s*\(/ nocase

        // Ruby - base64 decode
        $rb_b64decode = /\bBase64\s*\.\s*decode64\s*\(/ nocase
        $rb_b64decode_strict = /\bBase64\s*\.\s*strict_decode64\s*\(/ nocase
        $rb_b64decode_url = /\bBase64\s*\.\s*urlsafe_decode64\s*\(/ nocase
        $rb_unpack_m = /\.\s*unpack\s*\(\s*['"]m0?['"]/ nocase

        // Ruby - eval methods
        $rb_eval = /\beval\s*\(/ nocase
        $rb_instance_eval = /\binstance_eval\s*\(/ nocase

    condition:
        (any of ($py_b64decode*) and any of ($py_exec, $py_eval)) or
        (($js_atob or $js_buffer_b64) and ($js_eval or $js_function)) or
        (any of ($go_b64decode*) and $go_exec) or
        (any of ($rb_b64decode*, $rb_unpack_m) and any of ($rb_eval, $rb_instance_eval))
}
