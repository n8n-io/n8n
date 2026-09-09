rule threat_network_outbound_shady_links
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects URLs to URL shorteners, file sharing, and suspicious services"
        identifies = "threat.network.outbound.shady_links"
        severity = "medium"
        mitre_tactics = "command-and-control"
        specificity = "high"
        sophistication = "low"

        max_hits = 5
        path_include = "*.py,*.pyx,*.pyi,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go,*.rb,*.gemspec"
    strings:
        // URL shorteners - complete domains
        $shortener = /(\b|^|[\s"'(])(https??:\/\/)??[a-zA-Z0-9.-]*?(bit\.ly)\b/ nocase

        // Ephemeral/tunnels - complete domains (group 1). workers.dev omitted: it
        // hosts many legitimate assets.
        $ephemeral1 = /(\b|^|[\s"'(])(https??:\/\/)??[a-zA-Z0-9.-]*?(appdomain\.cloud|ngrok\.io|termbin\.com|localhost\.run|webhook\.(site|cool)|oastify\.com|burpcollaborator\.(me|net)|trycloudflare\.com)\b/ nocase

        // Ephemeral/tunnels - complete domains (group 2)
        $ephemeral2 = /(\b|^|[\s"'(])(https??:\/\/)??[a-zA-Z0-9.-]*?(oast\.(pro|live|site|online|fun|me)|ply\.gg|pipedream\.net|dnslog\.cn|webhook-test\.com|typedwebhook\.tools|beeceptor\.com|ngrok-free\.(app|dev))\b/ nocase

        // Exfiltration services - complete domains. discord.com scoped to the
        // webhook API path (not invite links).
        $exfil = /(\b|^|[\s"'(])(https??:\/\/)??[a-zA-Z0-9.-]*?(discord\.com\/api\/webhooks|transfer\.sh|filetransfer\.io|sendspace\.com|backblazeb2\.com|paste\.ee|pastebin\.com|hastebin\.com|ghostbin\.site|api\.telegram\.org|rentry\.co)\b/ nocase

        // Intel/IP lookup services - complete domains
        $intel = /(\b|^|[\s"'(])(https??:\/\/)??[a-zA-Z0-9.-]*?(ipinfo\.io|checkip\.dyndns\.org|ip\.me|jsonip\.com|ipify\.org|ifconfig\.me)\b/ nocase

        // Malware download services - complete domains
        $malware_dl = /(\b|^|[\s"'(])(https??:\/\/)??[a-zA-Z0-9.-]*?(files\.catbox\.moe)\b/ nocase

    condition:
        any of them
}
