#!/bin/bash
(
  echo '# Changes'
  echo ''
  git log --first-parent --pretty=format:'%s' \
    | grep -v '^update changelog' \
    | grep -v 'beta' \
    | perl -p -e 's/^((v?[0-9]+\.?)+)?$/\n## \1\n/g' \
    | perl -p -e 's/^([^#\s].*)$/* \1/g'
)> CHANGELOG.md
