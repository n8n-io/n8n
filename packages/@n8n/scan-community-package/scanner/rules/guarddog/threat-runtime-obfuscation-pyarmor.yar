rule threat_runtime_obfuscation_pyarmor
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects PyArmor obfuscation, a commercial tool commonly used to hide malicious code in Python packages"
        identifies = "threat.runtime.obfuscation.pyarmor"
        severity = "medium"
        mitre_tactics = "defense-evasion"
        specificity = "high"
        sophistication = "medium"

        path_include = "*.py,*.pyx,*.pyi,*.pth"
        max_hits = 1

    strings:
        // PyArmor bootstrap function call
        $pyarmor_bootstrap = /__pyarmor__\s*\(/

        // Legacy pytransform imports (PyArmor < 8.0)
        $legacy_import_from = /from\s+pytransform\s+import\s/
        $legacy_import = /import\s+pytransform\b/

        // PyArmor runtime initialization call
        $runtime_call = /pyarmor_runtime\s*\(/

        // Modern pyarmor_runtime package imports (PyArmor >= 8.0)
        $modern_import = /from\s+pyarmor_runtime\w*\s+import\s/

        // Armor enter/exit bytecode markers
        $armor_enter = "__armor_enter__"
        $armor_exit = "__armor_exit__"
        $pyarmor_enter = "__pyarmor_enter__"
        $pyarmor_exit = "__pyarmor_exit__"

        // PyArmor verification functions
        $check_armored = /check_armored\s*\(/
        $assert_armored = /assert_armored\s*\(/

    condition:
        any of them
}