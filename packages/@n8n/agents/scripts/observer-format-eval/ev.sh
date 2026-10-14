#!/bin/sh
# Runs a harness script with the eval env. Usage: ./ev.sh run.ts score | ./ev.sh gen.ts
cd "$(dirname "$0")" && exec npx dotenvx run -q -f ../../../../../.env.eval --overload -- npx tsx "$@"
