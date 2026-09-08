rule threat_setup_network_in_install
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects network operations or hostname/system info collection in setup.py, which is suspicious at install time"
        identifies = "threat.network.outbound"
        severity = "high"
        mitre_tactics = "exfiltration"
        specificity = "high"
        sophistication = "low"
        max_hits = 1
        path_include = "*/setup.py,setup.py"

    strings:
        // Network operations in setup.py
        $net_requests = /requests\.(get|post|put)\s*\(/ nocase
        $net_urllib_open = /urllib\.\w+\.urlopen\s*\(/ nocase
        $net_urllib_retrieve = /urllib\.\w+\.urlretrieve\s*\(/ nocase
        $net_http = /http\.client\.HTTP/ nocase
        $net_socket_connect = /socket\.\w*\.\s*connect\s*\(/ nocase
        $net_socket_create = /socket\.socket\s*\(/ nocase

        // Hostname / system info gathering in setup.py
        $sysinfo_hostname = /socket\.gethostname\s*\(\s*\)/ nocase
        $sysinfo_platform = /platform\.(system|machine|node|uname)\s*\(\s*\)/ nocase
        $sysinfo_getuser = /getpass\.getuser\s*\(\s*\)/ nocase
        $sysinfo_getlogin = /os\.getlogin\s*\(\s*\)/ nocase

        // Base64 decode of URLs (common obfuscation for exfil endpoints)
        $b64_decode = /base64\.\w*decode\s*\(/ nocase

        // Setup indicator
        $setup_call = /\bsetup\s*\(/ nocase
        $from_setuptools = /from\s+setuptools\s+import/ nocase
        $from_distutils = /from\s+distutils/ nocase

    condition:
        any of ($setup_call, $from_setuptools, $from_distutils) and
        (any of ($net_*) or ($b64_decode and any of ($sysinfo_*)))
}
