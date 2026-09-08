rule threat_network_reverse_shell
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects reverse shell patterns and remote access tools"
        identifies = "threat.network.outbound"
        severity = "high"
        mitre_tactics = "command-and-control"
        specificity = "high"
        sophistication = "medium"
        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.sh,*.rb"

    strings:
        // Bash reverse shells
        $bash_tcp = /bash\s+-i\s+>&\s+\/dev\/tcp\// nocase
        $bash_udp = /bash\s+-i\s+>&\s+\/dev\/udp\// nocase

        // Python reverse shell patterns
        $py_socket_connect = /socket\s*\.\s*socket\s*\(.*\)\s*\.\s*connect\s*\(/ nocase
        $py_pty_spawn = /pty\s*\.\s*spawn\s*\(/ nocase
        $py_subprocess_shell = /subprocess\.(call|Popen|run)\s*\(\s*\[?\s*['"]\/bin\/(ba)?sh/ nocase

        // Netcat reverse shell
        $nc_reverse = /\bnc\s+.*-e\s+\/bin\/(ba)?sh/ nocase
        $ncat_reverse = /\bncat\s+.*-e\s+\/bin\/(ba)?sh/ nocase

        // Python socket + exec/eval (socket-based remote control)
        $py_socket_exec = /socket.*\bexec\s*\(/ nocase
        $py_socket_eval = /socket.*\beval\s*\(/ nocase

        // Common reverse shell function names
        $func_reverse_shell = /def\s+(reverse_shell|rev_shell|connect_back|backdoor)\s*\(/ nocase

    condition:
        any of ($bash_*, $nc_*, $ncat_*) or
        ($py_socket_connect and ($py_pty_spawn or $py_subprocess_shell or $py_socket_exec or $py_socket_eval)) or
        $func_reverse_shell
}
