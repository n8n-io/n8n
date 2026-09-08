rule threat_network_exfil_sysinfo
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects system info collection combined with network exfiltration (hostname/user in HTTP requests)"
        identifies = "threat.network.outbound"
        severity = "high"
        mitre_tactics = "exfiltration"
        specificity = "high"
        sophistication = "medium"
        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // System info collection
        $py_hostname = /socket\.gethostname\s*\(\s*\)/ nocase
        // node/uname reveal host identity; system/machine are routine OS branching
        $py_platform = /platform\.(node|uname)\s*\(\s*\)/ nocase
        $py_getuser = /getpass\.getuser\s*\(\s*\)/ nocase
        $py_getlogin = /os\.getlogin\s*\(\s*\)/ nocase
        $py_username = /os\.environ\s*\[\s*['"]USER(NAME)?['"]\s*\]/ nocase
        $py_whoami = /os\.(system|popen)\s*\(\s*['"]whoami/ nocase

        $js_hostname = /os\.hostname\s*\(\s*\)/ nocase
        $js_userinfo = /os\.userInfo\s*\(\s*\)/ nocase

        // Network operations (sending data out)
        $py_requests = /requests\.(get|post|put)\s*\(/ nocase
        $py_urllib = /urllib\.\w+\.(urlopen|urlretrieve)\s*\(/ nocase
        $py_http = /http\.client\.HTTP/ nocase

        $js_fetch = /\bfetch\s*\(/ nocase
        $js_axios = /axios\.(get|post|put)\s*\(/ nocase
        $js_http_request = /https?\.(get|request)\s*\(/ nocase

    condition:
        // System info + network = exfiltration
        (any of ($py_hostname, $py_platform, $py_getuser, $py_getlogin, $py_username, $py_whoami) and any of ($py_requests, $py_urllib, $py_http)) or
        (any of ($js_hostname, $js_userinfo) and any of ($js_fetch, $js_axios, $js_http_request))
}
