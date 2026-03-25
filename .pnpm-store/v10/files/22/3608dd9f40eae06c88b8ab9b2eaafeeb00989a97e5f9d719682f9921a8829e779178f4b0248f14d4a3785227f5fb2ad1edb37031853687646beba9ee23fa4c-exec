#!/bin/bash
set -eux

if [ "$(uname -s)" != "Linux" ]; then
    echo "sentry-cli can only be released on Linux!"
    echo "Please use the GitHub Action instead."
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SCRIPT_DIR/..

VERSION="${1}"
TARGET="${2}"

echo "Current version: $VERSION"
echo "Bumping version: $TARGET"

perl -pi -e "s/^version = .*\$/version = \"$TARGET\"/" Cargo.toml
cargo update -p sentry-cli

# Do not tag and commit changes made by "npm version"
export npm_config_git_tag_version=false

# Bump main sentry cli npm package
npm version "${TARGET}"

# Bump the binary npm distributions
for dir in $SCRIPT_DIR/../npm-binary-distributions/*; do
    cd $dir
    npm version "${TARGET}"
    cd -
done

# Update the optional deps in the main cli npm package
# Requires jq to be installed - should be installed ootb on github runners
jq '.optionalDependencies |= map_values("'"${TARGET}"'")' $SCRIPT_DIR/../package.json > package.json.tmp && mv package.json.tmp $SCRIPT_DIR/../package.json
