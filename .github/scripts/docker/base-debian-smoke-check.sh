#!/bin/sh
# Checks the contract of the Debian base image (n8nio/base:<ver>-debian).
# Run it inside the image as root:
#   docker run --rm --user root -v "$PWD/<this file>:/smoke.sh:ro" <image> sh /smoke.sh
set -eu

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

# The n8n image, its entrypoint and the nodes run these by name.
for bin in node npm git ssh tini gm c_rehash apt-get; do
	command -v "$bin" >/dev/null || fail "$bin is not on PATH"
done

# The cloud launch and the AppArmor profile use this path.
/usr/local/bin/node -e 0 || fail "/usr/local/bin/node does not run"
tini -s -- true || fail "tini cannot run a process"

# The n8n image runs as this user and chowns /home/node to it.
[ "$(id -u node)" = 1000 ] || fail "user node does not have uid 1000"

# A module that `npm install -g` puts in place must be require()-able.
global_root="$(npm root -g)"
mkdir -p "$global_root/base-smoke-module"
echo 'module.exports = 42;' >"$global_root/base-smoke-module/index.js"
(cd / && node -e 'process.exit(require("base-smoke-module") === 42 ? 0 : 1)') ||
	fail "a global npm module is not require()-able from $global_root"
rm -rf "$global_root/base-smoke-module"

# The kafka native module links against this library. DHI ships no
# ld.so.cache, so look in the multiarch directory. The n8n image smoke test
# loads the module itself.
ls /usr/lib/*-linux-gnu/librdkafka.so.1 >/dev/null 2>&1 || fail "librdkafka.so.1 is missing"

# The EditImage node uses Arial by default and draws text with GraphicsMagick.
arial=/usr/share/fonts/truetype/msttcorefonts/Arial.ttf
[ -f "$arial" ] || fail "$arial is missing"
gm convert -size 200x50 xc:white -font "$arial" -pointsize 18 -draw "text 10,30 'smoke'" /tmp/smoke.png ||
	fail "GraphicsMagick cannot draw text with Arial"
[ -s /tmp/smoke.png ] || fail "GraphicsMagick wrote an empty image"

# Users extend this image with apt. Install a library that a vendor client needs.
apt-get update -qq >/dev/null || fail "apt-get update failed"
apt-get install -y -qq --no-install-recommends libaio1t64 >/dev/null || fail "apt-get install failed"

echo "Debian base smoke check passed ($(uname -m), node $(node -v))."
