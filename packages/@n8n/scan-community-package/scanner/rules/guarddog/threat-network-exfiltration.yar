rule threat_network_exfiltration
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects URLs to suspicious domains often used for exfiltration or C2"
        identifies = "threat.network.outbound"
        severity = "high"
        mitre_tactics = "exfiltration"
        specificity = "medium"
        sophistication = "medium"

        max_hits = 5
        path_include = "*.py,*.pyx,*.pyi,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go,*.rb,*.gemspec,*.rs"
    strings:
        // Webhook/tunneling services
        $webhook1 = "webhook.site" nocase
        $webhook2 = "webhook.cool" nocase
        $webhook3 = "oastify.com" nocase
        $webhook4 = "burpcollaborator.net" nocase
        $webhook5 = "burpcollaborator.me" nocase
        $webhook6 = "pipedream.net" nocase
        $webhook7 = "beeceptor.com" nocase

        // Tunneling services
        $tunnel1 = "ngrok.io" nocase
        $tunnel2 = "ngrok-free.app" nocase
        $tunnel3 = "trycloudflare.com" nocase
        $tunnel4 = "localhost.run" nocase

        // Paste/file sharing services
        $paste1 = "pastebin.com" nocase
        $paste2 = "hastebin.com" nocase
        $paste3 = "ghostbin.site" nocase
        $paste4 = "transfer.sh" nocase
        $paste5 = "filetransfer.io" nocase

        // Communication platforms (when used for exfil)
        $comm1 = "api.telegram.org" nocase
        $comm2 = "discord.com/api/webhooks" nocase

        // Suspicious TLDs; trailing boundary requires the TLD to end the host
        $tld1 = /https?:\/\/[^\s\/]+\.(xyz|tk|ml|ga|cf|gq)([\/:?#"'\s)]|$)/
        $tld2 = /https?:\/\/[^\s\/]+\.(pw|top|club|bid|icu)([\/:?#"'\s)]|$)/
        $tld3 = /https?:\/\/[^\s\/]+\.(zip|stream|link|quest)([\/:?#"'\s)]|$)/

        // Direct IP addresses in URLs, restricted to public addresses. The
        // exclusion of loopback/private ranges (0/8, 10/8, 127/8, 169.254/16,
        // 172.16-31, 192.168/16) is baked into the regex so it applies per
        // match: a private URL elsewhere in the file cannot suppress a real
        // public-IP C2 endpoint. First two octets gate the private ranges;
        // remaining octets are any valid 0-255.
        $ip = /https?:\/\/(([1-9]|1[1-9]|[2-9][0-9]|1[01][0-9]|12[0-6]|12[89]|1[3-5][0-9]|16[0-8]|17[01]|17[3-9]|18[0-9]|19[01]|19[3-9]|2[0-4][0-9]|25[0-5])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])|169\.(25[0-3]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9]|255)|172\.([0-9]|1[0-5]|3[2-9]|[4-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])|192\.([0-9]|[1-9][0-9]|1[0-5][0-9]|16[0-7]|169|17[0-9]|18[0-9]|19[0-9]|2[0-4][0-9]|25[0-5]))\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])/

    condition:
        any of ($webhook*, $tunnel*, $paste*, $comm*, $tld*) or
        $ip
}
