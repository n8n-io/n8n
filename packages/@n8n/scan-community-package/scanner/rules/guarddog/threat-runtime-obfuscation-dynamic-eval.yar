rule threat_runtime_obfuscation_dynamic_eval
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects JavaScript payloads executed through eval/Function over a self-decoding wrapper or character-code/base64 decoded data"
        identifies = "threat.runtime.obfuscation.dynamic-eval"
        severity = "high"
        mitre_tactics = "defense-evasion"
        specificity = "high"
        sophistication = "medium"

        max_hits = 1
        path_include = "*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"
        path_exclude = "dist/*,build/*,vendor/*,node_modules/*"

    strings:
        // eval of a function literal: a packed/self-decoding wrapper invoked
        // immediately. Legitimate code defines and calls functions, it does not
        // eval a function expression.
        $eval_func = /\beval\s*\(\s*function\s*\(/ nocase

        // eval / Function over character-code decoding
        $eval_fcc = /\beval\s*\([^;]{0,160}\bfromCharCode\b/ nocase
        $func_fcc = /\bnew\s+Function\s*\([^;]{0,160}\bfromCharCode\b/ nocase

        // eval / Function directly over base64 decoding
        $eval_atob = /\beval\s*\(\s*atob\s*\(/ nocase
        $func_atob = /\bnew\s+Function\s*\(\s*atob\s*\(/ nocase

        // eval of a decoder applied to a long numeric (char-code) array
        $eval_decoder_arr = /\beval\s*\(\s*[A-Za-z_$][\w$]*\s*\(\s*\[\s*\d{1,3}(\s*,\s*\d{1,3}){19,}/ nocase

    condition:
        any of them
}
