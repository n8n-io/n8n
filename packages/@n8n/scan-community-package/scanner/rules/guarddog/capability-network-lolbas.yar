include "lolbas-net.meta"

private rule has_process_spawn
{
    strings:
        // Python - subprocess/os
        $py_subprocess = /subprocess\.(call|run|Popen|check_output)/ nocase
        $py_os_system = "os.system(" nocase
        $py_os_popen = "os.popen(" nocase

        // JavaScript
        $js_exec = /\b(exec|execSync|spawn|spawnSync)\b/ nocase
        $js_require_cp = /require\s*\(\s*['"]child_process['"]\s*\)/ nocase

        // Go - exec
        $go_exec = "exec.Command(" nocase

    condition:
        any of them
}

rule capability_network_lolbas
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects usage of LOLBAS network tools (curl, wget, nc, etc.)"
        identifies = "capability.network"
        severity = "low"
        specificity = "low"
        sophistication = "low"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go"
    strings:
        // Windows LOLBAS tools anywhere within strings
        $certutil = /['"][^'"]*\bcertutil\b[^'"]*['"]/ nocase
        $bitsadmin = /['"][^'"]*\bbitsadmin\b[^'"]*['"]/ nocase
        $powershell_web = /['"][^'"]*Invoke-WebRequest[^'"]*['"]/ nocase
        $powershell_rest = /['"][^'"]*Invoke-RestMethod[^'"]*['"]/ nocase
        $socat = /['"][^'"]*\bsocat\b[^'"]*['"]/ nocase

    condition:
        has_process_spawn and (lolbas_net or any of ($certutil, $bitsadmin, $powershell_*, $socat))
}
