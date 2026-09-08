rule threat_setup_import_aliasing
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects suspicious import aliasing of dangerous functions in setup.py"
        identifies = "threat.setup.import.aliasing"
        severity = "high"
        mitre_tactics = "execution"
        specificity = "high"
        sophistication = "medium"
        max_hits = 3
        path_include = "*/setup.py,setup.py"

    strings:
        // Aliased imports of process execution functions
        $from_os_system = /from\s+os\s+import\s+system\s+as\s/ nocase
        $from_os_popen = /from\s+os\s+import\s+popen\s+as\s/ nocase
        $from_subprocess = /from\s+subprocess\s+import\s+(call|run|Popen|check_output|check_call)\s+as\s/ nocase

        // Aliased imports of code execution
        $from_os_exec = /from\s+os\s+import\s+exec\w*\s+as\s/ nocase
        $from_builtins_exec = /from\s+builtins\s+import\s+exec\s+as\s/ nocase

        // Aliased imports of sys.executable (used to re-invoke Python)
        $from_sys_executable = /from\s+sys\s+import\s+executable\s+as\s/ nocase

        // Aliased imports of temp file creation (dropper pattern)
        $from_tempfile = /from\s+tempfile\s+import\s+NamedTemporaryFile\s+as\s/ nocase

        // Non-aliased but suspicious: importing dangerous functions directly in setup.py
        $from_os_system_direct = /from\s+os\s+import\s+system\b/ nocase
        $from_sys_exec_direct = /from\s+sys\s+import\s+executable\b/ nocase

    condition:
        // Aliased imports are very suspicious in setup.py
        any of ($from_os_system, $from_os_popen, $from_subprocess, $from_os_exec, $from_builtins_exec) or
        // sys.executable + tempfile combo is a classic dropper
        ($from_sys_executable and $from_tempfile) or
        // Aliased sys.executable alone is suspicious
        $from_sys_executable or
        // Direct import of os.system in setup.py combined with tempfile
        ($from_os_system_direct and $from_tempfile) or
        ($from_sys_exec_direct and $from_tempfile)
}
