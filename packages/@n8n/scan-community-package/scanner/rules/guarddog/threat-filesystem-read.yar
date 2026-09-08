rule threat_filesystem_read
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects access to sensitive files (credentials, configs, keys)"
        identifies = "threat.filesystem.read"
        severity = "high"
        mitre_tactics = "credential-access"
        specificity = "low"
        sophistication = "low"

        max_hits = 5
        path_include = "*.py,*.pyx,*.pyi,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go,*.rb,*.gemspec"
    strings:
        // Password/credential files
        $passwd = "/etc/passwd" nocase
        $shadow = "/etc/shadow" nocase

        // Environment files - require quotes or path context to avoid matching process.env
        $env1 = /['"][^'"]*\.env['"]/ nocase
        $env2 = /['"][^'"]*\.env\.local['"]/ nocase
        $env3 = /['"][^'"]*\.env\.production['"]/ nocase

        // SSH keys
        $ssh1 = ".ssh/id_rsa"
        $ssh2 = ".ssh/id_ed25519"
        $ssh3 = ".ssh/id_ecdsa"

        // Git credentials
        $git1 = ".git/config"
        $git2 = ".git-credentials"
        $git3 = ".gitconfig"
        // A real path like "~/.netrc", not the bare ".netrc" constant HTTP
        // clients define for netrc auth
        $netrc = /['"][^'"]*\/\.netrc['"]/ nocase

        // Cloud credentials
        $aws = ".aws/credentials"
        $gcp = "gcloud/credentials"
        $azure = ".azure/credentials"

        // NPM/package manager tokens
        $npm = ".npmrc"
        $pypi = ".pypirc"

        // Browser/application data
        $chrome = "Google/Chrome/User Data"
        $firefox = ".mozilla/firefox"

    condition:
        any of them
}
