rule threat_npm_dependency_confusion
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects dependency confusion indicators: self-referencing dependencies or DNS exfil in scripts"
        identifies = "threat.npm.http.dependency"
        severity = "high"
        mitre_tactics = "initial-access"
        specificity = "high"
        sophistication = "low"
        max_hits = 1
        path_include = "*/package.json,package.json"

    strings:
        // DNS-based exfiltration in scripts (common dep confusion probe)
        $dns_exfil_nslookup = /nslookup\s+.*\$/ nocase
        $dns_exfil_dig = /\bdig\s+.*\$/ nocase
        $dns_exfil_host = /\bhost\s+.*\$/ nocase
        $dns_exfil_curl = /curl\s+.*\$\{?[A-Z_]+\}?\./ nocase

        // Whoami/hostname exfil via DNS (very common in dep confusion)
        $dns_whoami = /\$\(whoami\)/ nocase
        $dns_hostname = /\$\(hostname\)/ nocase

        // Beacon-style callbacks (common in dep confusion proofs)
        $beacon_curl = /curl\s+https?:\/\/[^\/]*\.(burpcollaborator|oastify|interact|canarytokens|dnslog)/ nocase
        $beacon_wget = /wget\s+https?:\/\/[^\/]*\.(burpcollaborator|oastify|interact|canarytokens|dnslog)/ nocase

    condition:
        any of them
}
