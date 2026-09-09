rule threat_network_dns_exfil
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects DNS-based data exfiltration: encoding data in DNS queries"
        identifies = "threat.network.outbound"
        severity = "high"
        mitre_tactics = "exfiltration"
        specificity = "high"
        sophistication = "medium"
        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Python: socket.getaddrinfo with f-string or format (data in subdomain)
        $py_getaddrinfo_f = /socket\.getaddrinfo\s*\(\s*f['"]/ nocase
        $py_getaddrinfo_fmt = /socket\.getaddrinfo\s*\(.*\.format\s*\(/ nocase
        $py_getaddrinfo_concat = /socket\.getaddrinfo\s*\(.*\+.*\+/ nocase

        // Python: socket.gethostbyname with constructed hostname
        $py_gethostbyname_f = /socket\.gethostbyname\s*\(\s*f['"]/ nocase
        $py_gethostbyname_fmt = /socket\.gethostbyname\s*\(.*\.format\s*\(/ nocase

        // General: nslookup/dig commands with variable interpolation
        $cmd_nslookup = /nslookup\s+.*\$/ nocase
        $cmd_dig = /\bdig\s+.*\$/ nocase

    condition:
        any of ($py_getaddrinfo_*, $py_gethostbyname_*) or
        any of ($cmd_*)
}
