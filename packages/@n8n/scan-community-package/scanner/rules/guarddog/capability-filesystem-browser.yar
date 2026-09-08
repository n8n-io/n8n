rule capability_filesystem_browser
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects browser credential and cookie access capabilities"
        identifies = "capability.filesystem.browser"
        severity = "medium"
        specificity = "high"
        sophistication = "low"
        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs"

    strings:
        // Browser-specific filesystem paths (high confidence)
        $chrome_userdata = /Chrome.*User Data/ nocase
        $chrome_login = /Chrome[^'"]*Login Data/ nocase
        $edge_userdata = /Microsoft\\\\Edge\\\\User Data/ nocase
        $firefox_path = ".mozilla/firefox" nocase
        $firefox_key4 = "key4.db" nocase
        $firefox_cookies_sqlite = "cookies.sqlite" nocase
        $safari_binarycookies = "Cookies.binarycookies" nocase
        $safari_localstorage = "Safari/LocalStorage" nocase

        // Browser credential extraction libraries
        $lib_chrome_cookies = "chrome-cookies-secure" nocase
        $lib_electron_cookies = "electron-cookies" nocase

        // SQLite + browser path combo signals
        $py_sqlite3 = "import sqlite3" nocase
        $js_sqlite3 = "require('sqlite3')" nocase
        $js_better_sqlite = "better-sqlite3" nocase
        $firefox_logins = "logins.json" nocase

    condition:
        // Browser-specific path access (high confidence)
        any of ($chrome_*, $edge_*, $firefox_path, $safari_*) or

        // Browser credential libraries
        any of ($lib_*) or

        // Combination: SQLite + browser credential files
        (any of ($py_sqlite3, $js_sqlite3, $js_better_sqlite) and
         any of ($firefox_logins, $firefox_cookies_sqlite, $firefox_key4))
}
