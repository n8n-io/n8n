rule threat_npm_http_dependency
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects HTTP/HTTPS URL dependencies in package.json (dependency confusion, untrusted sources)"
        identifies = "threat.npm.http.dependency"
        severity = "high"
        mitre_tactics = "initial-access"
        specificity = "low"
        sophistication = "low"
        max_hits = 3
        path_include = "*/package.json,package.json"

    strings:
        // HTTP URL as dependency version (IP address or domain)
        $http_ip = /:\s*"https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/ nocase
        $http_url = /:\s*"https?:\/\/[^"]+\.(tar\.gz|tgz|zip)"/ nocase
        // Generic HTTP dependency pointing to non-standard hosts
        $http_plain = /:\s*"http:\/\/[^"]+"/
        // Plain-http URLs in flat package metadata fields (homepage, author-as-string, ...)
        $http_meta = /"(web|website|homepage|funding|bugs|email|wiki|blog|docs|documentation|repository|author|maintainers|contributors|logo|image)"\s*:\s*"http:\/\//  nocase
        // Plain-http URL under the nested `url` key of a metadata object, e.g.
        // "author": { "url": "http://..." }. Scoped to metadata objects so a
        // dependency literally named `url` with an http specifier is still reported.
        $http_meta_url = /"(author|repository|bugs|funding|contributors|maintainers)"\s*:\s*[\[{][^}]*"url"\s*:\s*"http:\/\//  nocase

    condition:
        $http_ip or
        $http_url or
        // plain-http values beyond those explained by metadata = dependency URLs
        (#http_plain > #http_meta + #http_meta_url)
}
