include "hooks.meta"

rule capability_process_hooks
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects install hooks that can execute code during package installation"
        identifies = "capability.process.hooks"
        severity = "low"
        specificity = "low"
        sophistication = "low"

        max_hits = 1
        path_include = "*/package.json,setup.py,*/setup.py,*.gemspec"

    condition:
        has_npm_hook or has_python_hook or has_ruby_hook
}
