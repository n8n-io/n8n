#!/usr/bin/env bash
set -ex

rm -f ./*.svg ./*.png
for i in *.dot; do
  plantuml -Tsvg "$i";
done
