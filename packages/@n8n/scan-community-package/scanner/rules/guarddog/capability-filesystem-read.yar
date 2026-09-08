rule capability_filesystem_read
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects filesystem read capabilities"
        identifies = "capability.filesystem.read"
        severity = "low"
        specificity = "low"
        sophistication = "low"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go"
    strings:
        // Python
        $py_open = /\bopen\s*\([^)]*['"][^'"]*['"]\s*,\s*['"]r/
        $py_read = /\.(read|readlines|readline)\s*\(/
        $py_path = /Path\([^)]*\)\.read_(text|bytes)\(/

        // JavaScript/TypeScript
        $js_read = /fs\.(readFile|readFileSync)/
        $js_stream = /fs\.createReadStream/

        // Go
        $go_read = /ioutil\.ReadFile/
        $go_open = /os\.Open\(/

    condition:
        any of them
}
