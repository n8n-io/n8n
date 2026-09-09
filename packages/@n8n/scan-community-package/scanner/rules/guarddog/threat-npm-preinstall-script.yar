rule threat_npm_preinstall_script
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects npm preinstall scripts, which are almost exclusively used for malware delivery"
        identifies = "threat.process.hooks"
        severity = "high"
        mitre_tactics = "execution"
        specificity = "high"
        sophistication = "low"

        max_hits = 1
        path_include = "*/package.json"

    strings:
        $preinstall = /"preinstall"[\s]*:[\s]*"[^"]+/ nocase

    condition:
        $preinstall
}
