rule threat_process_cryptomining
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects cryptocurrency mining activity"
        identifies = "threat.process.cryptomining"
        severity = "high"
        mitre_tactics = "impact"
        specificity = "high"
        sophistication = "medium"
        max_hits = 3
        path_include = "*.py,*.pyx,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go,*.rb,*.sh,*.rs"

    strings:
        // Mining software
        $miner_xmrig = "xmrig" nocase
        $miner_ethminer = "ethminer" nocase
        $miner_cgminer = "cgminer" nocase
        $miner_bfgminer = "bfgminer" nocase
        $miner_cpuminer = "cpuminer" nocase
        $miner_ccminer = "ccminer" nocase

        // Mining pools
        $pool_monero = /(pool\.)?[a-z0-9-]+\.monero/ nocase
        $pool_supportxmr = "supportxmr.com" nocase
        $pool_minexmr = "minexmr.com" nocase
        $pool_nanopool = "nanopool.org" nocase

        // Mining protocols
        $stratum = "stratum+tcp://" nocase
        $stratum_ssl = "stratum+ssl://" nocase

        // Monero address (95 chars starting with 4). Word boundaries keep it from
        // matching inside a longer base64 blob.
        $monero_address = /\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b/ nocase

        // Mining-related terms in combination (require more context)
        $mining_hashrate = "hashrate" nocase
        $mining_nonce = "nonce" nocase
        $mining_stratum = "stratum" nocase
        $mining_miner = "miner" nocase

    condition:
        any of ($miner_*) or
        any of ($pool_*) or
        any of ($stratum*) or
        $monero_address or
        3 of ($mining_*)
}
