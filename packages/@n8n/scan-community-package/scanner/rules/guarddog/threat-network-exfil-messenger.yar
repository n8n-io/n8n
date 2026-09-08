rule threat_network_exfil_messenger
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects hardcoded messaging platform tokens/webhooks used for data exfiltration"
        identifies = "threat.network.outbound"
        severity = "high"
        mitre_tactics = "exfiltration"
        specificity = "high"
        sophistication = "low"
        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Telegram bot tokens (format: digits:alphanumeric)
        $telegram_token = /\b\d{8,12}:[A-Za-z0-9_-]{30,40}\b/

        // Telegram bot API URL with token
        $telegram_api = /api\.telegram\.org\/bot\d+:/

        // Telegram sendMessage/sendDocument calls
        $telegram_send = /telegram.*send(Message|Document)/i nocase

        // Discord webhook URLs
        $discord_webhook = /discord(app)?\.com\/api\/webhooks\/\d+\// nocase

        // Discord bot tokens (format: base64-ish string with dots)
        $discord_token = /['"][A-Za-z0-9]{24,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}['"]/

    condition:
        any of ($telegram_token, $telegram_api, $telegram_send) or
        any of ($discord_webhook, $discord_token)
}
