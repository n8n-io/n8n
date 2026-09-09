rule threat_runtime_enumeration
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects extensive system/network enumeration activities"
        identifies = "threat.runtime.enumeration"
        severity = "medium"
        mitre_tactics = "discovery"
        specificity = "medium"
        sophistication = "medium"
        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Python - process enumeration
        $py_psutil_process = "psutil.process_iter()" nocase
        $py_psutil_pids = "psutil.pids()" nocase
        $py_proc_list = "/proc/" nocase

        // Node.js - process enumeration
        $js_ps_list = "ps-list" nocase
        $js_process_list = "process-list" nocase
        $js_find_process = "find-process" nocase

        // Python - network interface enumeration
        $py_netifaces = "netifaces.interfaces()" nocase
        $py_ifconfig = "ifconfig" nocase
        // Word boundary after "addr" so prose like "IP Address" does not match.
        $py_ip_addr = /\bip\s+addr\b/ nocase

        // Node.js - network enumeration
        $js_os_networkinterfaces = "os.networkInterfaces()" nocase
        $js_network_list = "network-list" nocase

        // Python - user enumeration
        $py_etc_passwd = "/etc/passwd" nocase
        $py_pwd_getpwall = "pwd.getpwall()" nocase

        // Port scanning indicators. Keep "port" and "scan" adjacent so they can't
        // span unrelated identifiers like "afterImportPos = scanner". Match nmap
        // case-sensitively with word boundaries so it can't match "ChainMap".
        $port_scan = /\bport[\s_-]?scan/i nocase
        $nmap = /\bnmap\b/

    condition:
        2 of them
}
