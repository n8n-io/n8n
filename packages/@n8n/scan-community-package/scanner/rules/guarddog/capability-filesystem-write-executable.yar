rule capability_filesystem_write_executable
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects writing executable files or changing file permissions to executable"
        identifies = "capability.filesystem.write.executable"
        severity = "medium"
        specificity = "medium"
        sophistication = "low"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go"
    strings:
        // Python - chmod to executable
        $py_chmod_755 = "os.chmod(" nocase
        $py_stat_exec = "stat.S_IEXEC" nocase
        $py_stat_ixusr = "stat.S_IXUSR" nocase
        $py_chmod_octal = /os\.chmod\([^,]+,\s*0[oO][0-7]*[1357]/ nocase

        // Python - writing executable extensions
        $py_write_exe = /open\([^)]*\.exe/ nocase
        $py_write_dll = /open\([^)]*\.dll/ nocase
        $py_write_so = /open\([^)]*\.so/ nocase

        // JavaScript/Node.js - fs.chmod
        $js_chmod_755 = "fs.chmod(" nocase
        $js_chmodsync = "fs.chmodSync(" nocase
        $js_mode_755 = "0o755" nocase
        $js_mode_777 = "0o777" nocase

        // Go - chmod to executable
        $go_chmod = "os.Chmod(" nocase
        $go_mode_exec = "0755" nocase
        $go_mode_exec2 = "0o755" nocase
        $go_mode_exec3 = "0777" nocase

    condition:
        any of them
}
