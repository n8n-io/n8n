#!/usr/bin/env bash
# Build the private site into web/dist: the dashboard files plus the Supabase layer.
# Run from any directory: football-intel/web/build.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
static="$here/../src/footintel/api/static"
dist="$here/dist"
rm -rf "$dist"
mkdir -p "$dist"
cp "$static"/{index.html,app.js,style.css,value.html,value.js,value.css} "$here"/{site.js,site.css,config.js} "$dist"/
cp "$here/vercel.json" "$dist"/

SUPABASE_JS='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js" integrity="sha384-0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o" crossorigin="anonymous"></script>'
for page in index.html:app.js value.html:value.js; do
  file="$dist/${page%%:*}"
  script="${page##*:}"
  grep -q "<script src=\"$script\"></script>" "$file"
  sed -i \
    -e "s|</head>|<meta name=\"robots\" content=\"noindex, nofollow\">\n<link rel=\"stylesheet\" href=\"site.css\">\n</head>|" \
    -e "s|<script src=\"$script\"></script>|$SUPABASE_JS\n<script src=\"config.js\"></script>\n<script src=\"site.js\"></script>\n<script src=\"$script\"></script>|" \
    "$file"
done
# CDN_COMMIT=<sha>: serve the scripts and styles from jsDelivr at that pushed commit, with
# integrity hashes, so the Vercel deployment holds only the small HTML and config files.
if [ -n "${CDN_COMMIT:-}" ]; then
  cdn="https://cdn.jsdelivr.net/gh/benkas418-alt/n8n@$CDN_COMMIT/football-intel"
  for asset in app.js:src/footintel/api/static style.css:src/footintel/api/static \
               value.js:src/footintel/api/static value.css:src/footintel/api/static site.js:web site.css:web; do
    name="${asset%%:*}"
    url="$cdn/${asset##*:}/$name"
    sri="sha384-$(openssl dgst -sha384 -binary "$dist/$name" | openssl base64 -A)"
    curl -fsS "$url" | cmp -s - "$dist/$name" || { echo "!! $url differs from the local file: push first" >&2; exit 1; }
    sed -i -e "s|src=\"$name\"|src=\"$url\" integrity=\"$sri\" crossorigin=\"anonymous\"|" \
           -e "s|href=\"$name\"|href=\"$url\" integrity=\"$sri\" crossorigin=\"anonymous\"|" \
      "$dist/index.html" "$dist/value.html"
    rm "$dist/$name"
  done
fi
echo "Site built in $dist"
