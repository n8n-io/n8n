rule threat_process_memory
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects memory scraping and credential dumping from process memory"
        identifies = "threat.process.memory"
        severity = "high"
        mitre_tactics = "credential-access"
        specificity = "low"
        sophistication = "high"
        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Python - process memory access
        $py_psutil_memory = "psutil.Process(" nocase
        $py_memory_info = ".memory_info()" nocase
        $py_memory_maps = ".memory_maps()" nocase
        $py_proc_mem = "/proc/*/mem" nocase
        $py_proc_maps = "/proc/*/maps" nocase

        // Python - ptrace (Linux debugger interface)
        $py_ptrace_attach = "ptrace.attach(" nocase
        $py_ptrace_peek = "PTRACE_PEEKDATA" nocase

        // Python - Windows memory access
        $py_readprocessmemory = "ReadProcessMemory" nocase
        $py_openprocess = "OpenProcess" nocase

        // Python - credential dumping tools/techniques
        $py_mimikatz = "mimikatz" nocase
        $py_pypykatz = "pypykatz" nocase
        $py_lsass = "lsass" nocase
        $py_secretsdump = "secretsdump" nocase

        // Python - memory dumping
        $py_minidump = "minidump" nocase
        $py_procdump = "procdump" nocase

        // Node.js - process memory access (via native modules)
        $js_ffi = "require('ffi-napi')" nocase
        $js_memoryjs = "memoryjs" nocase
        $js_readprocessmemory = "ReadProcessMemory" nocase
        $js_openprocess = "OpenProcess" nocase

        // Node.js - debugging/profiling APIs
        $js_inspector = "require('inspector')" nocase
        $js_heapdump = "require('heapdump')" nocase
        $js_v8_profiler = "require('v8-profiler')" nocase

        // Memory search patterns
        $search_password = /(search|scan|find).*(password|credential|secret|token)/i nocase
        $extract_memory = /(extract|dump|read).*(memory|heap|process)/i nocase

        // Regex patterns for credentials in memory
        $regex_password = /password\s*[:=]/i nocase
        $regex_token = /token\s*[:=]/i nocase
        $regex_api_key = /api[_-]?key\s*[:=]/i nocase

        // Python - memory scanning libraries
        $py_regex_search = "re.search(" nocase
        $py_regex_findall = "re.findall(" nocase
        $py_bytes_find = ".find(b'" nocase

    condition:
        // Python memory access APIs
        (any of ($py_psutil_memory, $py_memory_info, $py_memory_maps) and
         (any of ($search_password, $extract_memory, $regex_password, $regex_token))) or

        // Low-level memory access. OpenProcess only counts with an actual memory
        // read (alone it is a benign liveness check).
        any of ($py_ptrace_attach, $py_ptrace_peek, $py_readprocessmemory) or
        ($py_openprocess and $py_readprocessmemory) or

        // Python credential dumping tools
        any of ($py_mimikatz, $py_pypykatz, $py_lsass, $py_secretsdump) or

        // Python memory dumping
        (any of ($py_minidump, $py_procdump) and $py_proc_mem) or

        // Node.js native memory access
        (any of ($js_ffi, $js_memoryjs) and
         (any of ($js_readprocessmemory, $js_openprocess))) or

        // Node.js heap/memory profiling + credential search
        (any of ($js_heapdump, $js_v8_profiler, $js_inspector) and
         (any of ($search_password, $extract_memory))) or

        // Memory scanning for credentials
        ((any of ($py_regex_search, $py_regex_findall, $py_bytes_find)) and
         (any of ($regex_password, $regex_token, $regex_api_key)) and
         (any of ($py_memory_info, $py_proc_mem, $py_proc_maps)))
}
