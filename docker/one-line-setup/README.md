# A One line setup via SEA spike

Nodejs supports [Single Executable Applications](https://nodejs.org/api/single-executable-applications.html) from 26 onwards. This
allows us to build a single executable binary out of our nodejs application which can be executed on systems that don't have nodejs installed.

What this would allow us to do is create interactive and easy-to-maintain setup scripts to be distributed via https://get.n8n.io/
instead of the current single shell script. This would allow us to expand on the current functionality without having to
fight the functional limitation of bash/shell scripts.

>[!NOTE]
> This is just a spike of this feature and is not ready to ship as is.


## What we would gain

- Real language for logic that's already ~450 lines of POSIX sh and growing — the .env templating, upgrade semantics, and error handling in get-n8n.sh are at the edge of what's pleasant in shell.
- Interactive UX (@clack/prompts — prompting for the Instance AI API key, port choice, install dir) which is essentially impossible to do nicely in a piped shell script.
- Unit-testable code instead of the test-get-n8n.sh harness for everything.

## What it costs

- A release pipeline. Today the script is fetched from raw master — always fresh, zero process. SEAs need a CI matrix (linux-x64, linux-arm64, darwin-arm64, probably darwin-x64; WSL is covered by the linux builds), uploads to GitHub Releases, published checksums, and a story for how the bootstrap picks a version (latest release vs pinned).
- Size. A SEA embeds the full Node runtime: ~50MB gzipped, ~110MB on disk, versus 13KB today. Defensible given the user is about to pull multi-GB Docker images, but it's the new first impression of "one-line setup", and --upgrade re-downloads it each time unless you cache it (e.g. under ${N8N_DIR}/bin keyed by version).
- Signing. Your ad-hoc codesign is fine for local dev, and curl-downloaded files don't get the quarantine xattr so the piped flow works — but anyone who downloads the binary via a browser hits Gatekeeper. Shipping company binaries properly means Developer ID signing + notarization in CI for the darwin builds.
- Transparency. The current script explicitly advertises "prefer to inspect before running?" — a binary is opaque. Mitigate with checksums in the bootstrap, source in-repo, and building only from CI.
- musl hosts. Official Node binaries (and thus SEAs built from them) are glibc-linked, so an Alpine host would fail. Rare for docker-compose hosts, but the bootstrap should detect it and print a clear error rather than a loader crash.
