rule threat_runtime_self_propagation
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects worm/self-propagating behavior: package code that rewrites its own manifest and programmatically publishes copies to a package registry to spread"
        identifies = "threat.runtime.self-propagation"
        severity = "high"
        mitre_tactics = "lateral-movement"
        specificity = "high"
        sophistication = "low"

        max_hits = 1
        path_include = "*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Programmatically invoking a registry publish from package code
        // (npm/yarn/pnpm) -- a publish is a developer/CI action, not something
        // a package does to itself at runtime unless it is propagating.
        $publish = /['"`]\s*(npm|yarn|pnpm)\s+publish/ nocase

        // Rewriting its own manifest to clone itself under a new identity.
        $write_manifest = /\b(writeFile(Sync)?|writeJson(Sync)?|outputJson(Sync)?)\s*\(\s*['"`][^'"`]*package(-lock)?\.json/ nocase

        // Process-execution capability used to drive the publish.
        $cp_require = /require\s*\(\s*['"]child_process['"]\s*\)/
        $cp_exec = /\bexec(Sync|File|FileSync)?\s*\(/
        $cp_spawn = /\bspawn(Sync)?\s*\(/

    condition:
        $publish
        and $write_manifest
        and any of ($cp_require, $cp_exec, $cp_spawn)
}
