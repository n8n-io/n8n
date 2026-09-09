rule threat_process_powershell_encoded
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects PowerShell encoded commands, hidden windows, and download cradles"
        identifies = "threat.process.spawn"
        severity = "high"
        mitre_tactics = "execution"
        specificity = "high"
        sophistication = "medium"
        max_hits = 3
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // PowerShell encoded command (base64-encoded PS commands)
        $ps_encoded = /powershell.*-EncodedCommand\s+[A-Za-z0-9+\/=]{20,}/ nocase
        $ps_enc_short = /powershell.*-enc\s+[A-Za-z0-9+\/=]{20,}/ nocase

        // PowerShell hidden window
        $ps_hidden = /powershell.*-WindowStyle\s+Hidden/ nocase

        // PowerShell download cradles
        $ps_iex_iwr = /IEX\s*\(\s*(New-Object\s+Net\.WebClient|Invoke-WebRequest)/ nocase
        $ps_downloadstring = /\(New-Object\s+Net\.WebClient\)\.DownloadString\s*\(/ nocase
        $ps_downloadfile = /\(New-Object\s+Net\.WebClient\)\.DownloadFile\s*\(/ nocase

        // Python calling PowerShell with these patterns
        $py_popen_ps = /Popen\s*\(\s*['"]powershell/ nocase
        $py_system_ps = /os\.(system|popen)\s*\(\s*['"]powershell/ nocase

    condition:
        any of ($ps_encoded, $ps_enc_short) or
        ($ps_hidden and any of ($py_*)) or
        any of ($ps_iex_iwr, $ps_downloadstring, $ps_downloadfile)
}
