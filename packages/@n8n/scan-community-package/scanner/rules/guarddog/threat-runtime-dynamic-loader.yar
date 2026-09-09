rule threat_runtime_dynamic_loader
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects dynamic code loading: downloading and importing/executing code at runtime"
        identifies = "threat.runtime.obfuscation"
        severity = "high"
        mitre_tactics = "defense-evasion"
        specificity = "high"
        sophistication = "high"
        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth"

    strings:
        // Dynamic import mechanisms
        $importlib_import = /importlib\.import_module\s*\(/ nocase
        $importlib_util = /importlib\.util\.spec_from_/ nocase
        $builtins_import = /__import__\s*\(/ nocase

        // getattr for dynamic function resolution
        $getattr_call = /getattr\s*\(\s*\w+\s*,/ nocase

        // Network download via an actual fetch call, not a bare urllib import
        $urllib_dl = /urllib\.\w*request\w*\.(urlopen|urlretrieve)\s*\(/ nocase
        $requests_get = /requests\.get\s*\(/ nocase

        // base64 decode (for obfuscated module names/URLs)
        $b64_decode = /base64\.\w*decode/ nocase
        $b64_b64decode = /b64decode\s*\(/ nocase

        // Execution sink: bare exec(/eval(, not method calls. Required alongside
        // import+download, which co-occur in many benign plugin loaders.
        $exec_sink = /[^.\w]exec\s*\(/ nocase
        $eval_sink = /[^.\w]eval\s*\(/ nocase

    condition:
        // Dynamic import + network download + execution of the payload
        (any of ($importlib_*, $builtins_import) and any of ($urllib_*, $requests_get) and any of ($exec_sink, $eval_sink)) or
        // Dynamic import + getattr + base64 (obfuscated dynamic loading)
        (any of ($importlib_*, $builtins_import) and $getattr_call and any of ($b64_*))
}
