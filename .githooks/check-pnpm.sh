#!/bin/sh
# .githooks/check-pnpm — symlink or call from post-merge, post-rewrite, post-checkout

WANTED=$(sed -n 's/.*"packageManager": *"pnpm@\([0-9]*\).*/\1/p' package.json)
CURRENT=$(cd ~ && pnpm --version 2>/dev/null | cut -d. -f1)
[ -z "$WANTED" ] || [ "$WANTED" = "$CURRENT" ] && exit 0
echo ""
echo "⚠ This repo now pins pnpm $WANTED (you have ${CURRENT:-none})."
echo "  pnpm should auto-download it on the next install command."
echo "  If that fails (some pnpm 10 versions can't install v12), reinstall:"
echo "    curl -fsSL https://get.pnpm.io/install.sh | sh -"
echo ""
exit 0
