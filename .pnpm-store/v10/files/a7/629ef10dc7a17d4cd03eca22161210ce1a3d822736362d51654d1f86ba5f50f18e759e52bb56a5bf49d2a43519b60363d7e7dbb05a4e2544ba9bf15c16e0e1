#!/bin/bash

# This script is run by Craft after a release is created.
# We currently use it to bump the platform-specific optional dependencies to their new versions
# in the package-lock.json, immediately after a release is created. This is needed for CI to
# pass after the release is created.c

set -eux
OLD_VERSION="${1}"
NEW_VERSION="${2}"

git checkout master

# We need to update the package-lock.json to include the new version of the optional dependencies.
npm install --package-lock-only --ignore-scripts

git add package-lock.json

# Only commit if there are changes
git diff --staged --quiet || git commit -m "build(npm): 🤖 Bump optional dependencies to ${NEW_VERSION}"
git pull --rebase
git push
