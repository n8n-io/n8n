# Sandbox egress stays unchanged in v1

Persistent pip and npm need network. A registry allowlist is the right long-term control, but it lives in the sandbox service. This work uses the current Workspace egress. Do not block Session Files on a registry allowlist.

**Considered Options**: Block install network; allow PyPI and npmjs only; deny all outbound network except registries.
