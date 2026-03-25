#!/usr/bin/env bash

file_has_changed () {
  if [ ! -f $1 ]; then
    return 1
  fi

  for f in `git ls-files --modified`; do
    [[ "$f" == "$1" ]] && return 0
  done

  return 1
}

version_is_unique () {
  for v in `git tag -l`; do
    [[ "$v" == "v$1" ]] && return 1
  done

  return 0
}

on_master_branch () {
  [[ $(git symbolic-ref --short -q HEAD) == "master" ]] && return 0
  return 1
}

version=$(cat VERSION)
previous_version=$(git describe --abbrev=0)

if ! on_master_branch; then
  echo -e "\033[0;31mRefusing to release from non master branch.\033[0m"
  exit 1
fi

if ! file_has_changed "VERSION"; then
  echo -e "\033[0;31mRefusing to release because VERSION has not changed.\033[0m"
  exit 1
fi

if ! file_has_changed "CHANGELOG.md"; then
  echo -e "\033[0;31mRefusing to release because CHANGELOG.md has not been updated.\033[0m"
  exit 1
fi

if ! file_has_changed "package.json"; then
  echo -e "\033[0;31mRefusing to release because package.json has not been updated.\033[0m"
  exit 1
fi

if ! version_is_unique $version; then
  echo -e "\033[0;31mRefusing to release because VERSION is not unique.\033[0m"
  exit 1
fi

echo -e "\033[1mAbout to release v$version with the following changes:\033[0m"
git log --date=short --pretty=format:"%ad %h%x09%an%x09%s" $previous_version..HEAD

echo

echo -e "\033[1mThe following files will be part of the release commit:\033[0m"
git ls-files --modified

echo

read -e -p "Are you sure you want to release? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\033[0;32mReleasing...\033[0m"
  echo
  git commit -a -m "Build version $version"
  git tag -a v$version -m "Version $version"
  git push origin master
  git push --tags

  npm publish
else
  echo -e "\033[0;31mCancelling...\033[0m"
fi
