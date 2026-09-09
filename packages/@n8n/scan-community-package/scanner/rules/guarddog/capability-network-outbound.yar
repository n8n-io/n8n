rule capability_network_outbound
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects network request capabilities (HTTP, sockets, etc.)"
        identifies = "capability.network.outbound"
        severity = "low"
        specificity = "low"
        sophistication = "low"

        max_hits = 1
        path_include = "*.py,*.pyx,*.pyi,*.pth,*.js,*.ts,*.jsx,*.tsx,*.mjs,*.cjs,*.go,*.rb,*.gemspec,*.rs"
    strings:
        // Python - HTTP
        $py_requests = /requests\.(get|post|put|delete|head|patch)/
        $py_urllib = /urllib\.request\.(urlopen|urlretrieve|Request)/
        $py_http = /http\.client\.(HTTPConnection|HTTPSConnection)/
        $py_socket = /socket\.socket\([^)]*SOCK_STREAM/

        // Python - DNS
        $py_getaddrinfo = /socket\.getaddrinfo\s*\(/
        $py_gethostbyname = /socket\.gethostbyname/
        $py_gethostbyaddr = /socket\.gethostbyaddr/
        $py_dns_resolver = /dns\.resolver/

        // JavaScript/TypeScript - HTTP
        $js_fetch = /\bfetch\s*\(/
        $js_axios = /axios\.(get|post|put|delete|patch)/
        $js_http = /require\s*\(\s*['"]https?['"]\s*\)/
        $js_request = /\brequire\s*\(\s*['"]request['"]\s*\)/

        // JavaScript/TypeScript - DNS
        $js_dns_require = /require\s*\(\s*['"]dns['"]\s*\)/
        $js_dns_lookup = /\.(lookup|resolve4|resolve6|resolveMx|resolveTxt|resolveNs|resolveCname|resolveSrv|resolvePtr|resolveSoa|resolveNaptr)\s*\(/
        $js_dns_resolve = /\bresolve\s*\(/
        $js_dns_import = /import\s+.*\s+from\s+['"]dns['"]/

        // Go - HTTP
        $go_http = /http\.(Get|Post|Head|Do)\(/
        $go_client = /&?http\.Client\{/

        // Go - DNS
        $go_lookup = /net\.(LookupHost|LookupIP|LookupAddr|LookupCNAME|LookupMX|LookupNS|LookupTXT)\s*\(/

        // Rust - HTTP and sockets
        $rs_reqwest_get = /\breqwest\s*::\s*(blocking\s*::\s*)?get\s*\(/
        $rs_reqwest_client = /\breqwest\s*::\s*(blocking\s*::\s*)?Client\s*::\s*new\s*\(/
        $rs_tcp_connect = /\bTcpStream\s*::\s*connect\s*\(/
        $rs_udp_connect = /\bUdpSocket\s*::\s*connect\s*\(/

        // Ruby - HTTP libraries (Net::HTTP)
        $rb_net_http_get = /\bNet\s*::\s*HTTP\s*\.\s*get\s*\(/ nocase
        $rb_net_http_post = /\bNet\s*::\s*HTTP\s*\.\s*post\s*\(/ nocase
        $rb_net_http_start = /\bNet\s*::\s*HTTP\s*\.\s*start\s*\(/ nocase
        $rb_net_http_new = /\bNet\s*::\s*HTTP\s*\.\s*new\s*\(/ nocase

        // Ruby - URI and OpenURI
        $rb_uri_open = /\bURI\s*\.\s*open\s*\(/ nocase
        $rb_openuri = /\bOpenURI\s*\.\s*open_uri\s*\(/ nocase

        // Ruby - HTTParty
        $rb_httparty_get = /\bHTTParty\s*\.\s*get\s*\(/ nocase
        $rb_httparty_post = /\bHTTParty\s*\.\s*post\s*\(/ nocase

        // Ruby - Faraday
        $rb_faraday_get = /\bFaraday\s*\.\s*get\s*\(/ nocase
        $rb_faraday_post = /\bFaraday\s*\.\s*post\s*\(/ nocase

        // Ruby - RestClient
        $rb_restclient_get = /\bRestClient\s*\.\s*get\s*\(/ nocase
        $rb_restclient_post = /\bRestClient\s*\.\s*post\s*\(/ nocase

        // Ruby - Socket connections
        $rb_tcpsocket_new = /\bTCPSocket\s*\.\s*new\s*\(/ nocase
        $rb_tcpsocket_open = /\bTCPSocket\s*\.\s*open\s*\(/ nocase
        $rb_udpsocket_new = /\bUDPSocket\s*\.\s*new\s*\(/ nocase
        $rb_udpsocket_open = /\bUDPSocket\s*\.\s*open\s*\(/ nocase
        $rb_socket_tcp = /\bSocket\s*\.\s*tcp\s*\(/ nocase

    condition:
        any of them
}
