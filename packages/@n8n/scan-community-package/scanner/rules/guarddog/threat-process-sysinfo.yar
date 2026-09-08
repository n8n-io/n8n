include "lolbas-sysinfo.meta"

rule threat_process_sysinfo
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects LOLBAS usage in process spawning"
        identifies = "threat.process.spawn.sysinfo"
        severity = "medium"
        mitre_tactics = "collection"
        specificity = "medium"
        sophistication = "low"

        max_hits = 5
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    condition:
        lolbas_sysinfo
}
