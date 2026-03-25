#!/bin/bash

pkgs=(
  "com.apple.pkg.DeveloperToolsCLILeo" # standalone
  "com.apple.pkg.DeveloperToolsCLI"    # from XCode
  "com.apple.pkg.CLTools_Executables"  # Mavericks
)

for pkg in "${pkgs[@]}"; do
  output=$(/usr/sbin/pkgutil --pkg-info "$pkg" 2>/dev/null)
  if [ "$output" ]; then
    version=$(echo "$output" | grep 'version' | cut -d' ' -f2)
    break
  fi
done

if [ "$version" ]; then
  echo "Command Line Tools version: $version"
else
  echo >&2 'Command Line Tools not found'
fi
