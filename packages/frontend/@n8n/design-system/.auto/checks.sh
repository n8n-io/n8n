#!/bin/bash
set -euo pipefail

pnpm typecheck >/tmp/design-system-typecheck.log 2>&1 || { tail -80 /tmp/design-system-typecheck.log; exit 1; }
pnpm lint >/tmp/design-system-lint.log 2>&1 || { tail -80 /tmp/design-system-lint.log; exit 1; }
