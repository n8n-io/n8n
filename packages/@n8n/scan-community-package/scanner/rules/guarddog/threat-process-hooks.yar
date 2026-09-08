rule threat_process_hooks
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects LOLBAS usage in install hooks (execution and network tools)"
        identifies = "threat.process.hooks"
        severity = "medium"
        mitre_tactics = "execution"
        specificity = "medium"
        sophistication = "low"

        max_hits = 1
        path_include = "*/package.json,*/setup.py"

    strings:
        // npm install hooks (exclude prepare/prepack - build lifecycle, not attack vectors)
        $npm_preinstall = /"preinstall"[\s]*:[\s]*"[^"]+/ nocase
        $npm_install = /"install"[\s]*:[\s]*"[^"]+/ nocase
        $npm_postinstall = /"postinstall"[\s]*:[\s]*"[^"]+/ nocase

        // Python setuptools hooks
        $py_cmdclass_install = /cmdclass\s*=\s*\{[^}]*['"]install['"]\s*:/ nocase
        $py_cmdclass_develop = /cmdclass\s*=\s*\{[^}]*['"]develop['"]\s*:/ nocase
        $py_cmdclass_egg_info = /cmdclass\s*=\s*\{[^}]*['"]egg_info['"]\s*:/ nocase

        // setup.py top-level execution (setup() with imports running code at module level)
        $py_setup = /\bsetup\s*\(/ nocase

        // LOLBAS process execution
        $bash_c = /\bbash\s+-c\b/
        $sh_c = /\bsh\s+-c\b/
        $bash_path = /\/bin\/bash\b/
        $sh_path = /\/bin\/sh\b/
        $bash_script = /\bbash\s+\S+\.(sh|bash)\b/
        $sh_script = /\bsh\s+\S+\.sh\b/
        $python_flag = /\bpython[0-9]?\s+-[cmubE]\b/
        $python_script = /\bpython[0-9]?\s+\S+\.py\b/
        $node_flag = /\bnode\s+-e\b/
        $node_script = /\bnode\s+\S+\.js\b/
        $perl_flag = /\bperl\s+-[eE]\b/
        $ruby_flag = /\bruby\s+-e\b/
        $php_flag = /\bphp\s+-r\b/

        // LOLBAS network tools
        $curl_flag = /\bcurl\s+-[sSfLokOdXH]/ nocase
        $curl_url = /\bcurl\s+['"]?https?:\/\// nocase
        $curl_pipe = /\bcurl\s.*\|/ nocase
        $wget_flag = /\bwget\s+-/ nocase
        $wget_url = /\bwget\s+['"]?https?:\/\// nocase
        $nc_flag = /\bnc\s+-[lvnzwep]/ nocase
        $nc_host = /\bnc\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/ nocase
        $netcat_cmd = /\bnetcat\s/ nocase

    condition:
        (any of ($npm_*) or any of ($py_*)) and
        (any of ($bash_*, $sh_*, $python_*, $node_*, $perl_*, $ruby_*, $php_*,
                 $curl_*, $wget_*, $nc_*, $netcat_*))
}
