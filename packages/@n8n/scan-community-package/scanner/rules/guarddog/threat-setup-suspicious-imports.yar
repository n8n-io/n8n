rule threat_setup_suspicious_imports
{
    meta:
        author = "GuardDog Team, Datadog"
        description = "Detects suspicious imports in setup.py: network, system, or crypto libraries that have no place in a build script"
        identifies = "threat.setup.import.aliasing"
        severity = "high"
        mitre_tactics = "execution"
        specificity = "high"
        sophistication = "low"
        max_hits = 1
        path_include = "*/setup.py,setup.py"

    strings:
        // Network libraries (no legitimate reason in setup.py)
        $import_requests = /\bimport\s+requests\b/ nocase
        $import_urllib = /\bimport\s+urllib\b/ nocase
        $from_urllib = /\bfrom\s+urllib/ nocase
        $import_http = /\bimport\s+http\.client\b/ nocase
        $import_socket = /\bimport\s+socket\b/ nocase

        // Code execution / system
        $import_subprocess = /\bimport\s+subprocess\b/ nocase
        $import_ctypes = /\bimport\s+ctypes\b/ nocase
        $import_winreg = /\bimport\s+winreg\b/ nocase

        // Crypto/encoding (used for payload obfuscation)
        $import_base64 = /\bimport\s+base64\b/ nocase
        $import_marshal = /\bimport\s+marshal\b/ nocase
        $import_codecs = /\bimport\s+codecs\b/ nocase

        // Build script indicator
        $setup_call = /\bsetup\s*\(/ nocase

    condition:
        $setup_call and (
            any of ($import_requests, $import_urllib, $from_urllib, $import_http, $import_socket) or
            (any of ($import_subprocess, $import_ctypes, $import_winreg) and
             any of ($import_requests, $import_urllib, $from_urllib, $import_http, $import_socket,
                     $import_base64, $import_marshal, $import_codecs))
        )
}
