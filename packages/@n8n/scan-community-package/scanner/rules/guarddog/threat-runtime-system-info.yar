rule threat_runtime_system_info
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects active collection of system information (hostname, platform, architecture, user)"
        identifies = "threat.runtime.system.info"
        severity = "low"
        mitre_tactics = "collection"
        specificity = "low"
        sophistication = "low"

        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go,*.rb,*.gemspec"
    strings:
        // Python - require platform/socket module prefix for specificity
        $py_platform_system = /\bplatform\.system\s*\(\s*\)/ nocase
        $py_platform_machine = /\bplatform\.machine\s*\(\s*\)/ nocase
        $py_platform_node = /\bplatform\.node\s*\(\s*\)/ nocase
        $py_platform_uname = /\bplatform\.uname\s*\(\s*\)/ nocase
        $py_platform_architecture = /\bplatform\.architecture\s*\(\s*\)/ nocase
        $py_socket_gethostname = /\bsocket\.gethostname\s*\(\s*\)/ nocase
        $py_getpass_getuser = /\bgetpass\.getuser\s*\(\s*\)/ nocase

        // JavaScript - require os module prefix
        $js_os_platform = /\bos\.platform\s*\(\s*\)/ nocase
        $js_os_arch = /\bos\.arch\s*\(\s*\)/ nocase
        $js_os_hostname = /\bos\.hostname\s*\(\s*\)/ nocase
        $js_os_type = /\bos\.type\s*\(\s*\)/ nocase
        $js_os_userinfo = /\bos\.userInfo\s*\(\s*\)/ nocase
        $js_os_release = /\bos\.release\s*\(\s*\)/ nocase
        $js_os_homedir = /\bos\.homedir\s*\(\s*\)/ nocase
        $js_os_tmpdir = /\bos\.tmpdir\s*\(\s*\)/ nocase

        // Go - unique system info function calls
        $go_goos = /\bruntime\.GOOS\b/ nocase
        $go_goarch = /\bruntime\.GOARCH\b/ nocase
        $go_hostname = /\bos\.Hostname\s*\(\s*\)/ nocase

        // Ruby - system info
        $rb_socket_gethostname = /\bSocket\s*\.\s*gethostname\b/ nocase
        $rb_etc_getlogin = /\bEtc\s*\.\s*getlogin\b/ nocase
        $rb_etc_getpwuid = /\bEtc\s*\.\s*getpwuid\s*\(/ nocase

    condition:
        // Require 3+ distinct system info calls to indicate enumeration, not just platform check
        3 of them
}
