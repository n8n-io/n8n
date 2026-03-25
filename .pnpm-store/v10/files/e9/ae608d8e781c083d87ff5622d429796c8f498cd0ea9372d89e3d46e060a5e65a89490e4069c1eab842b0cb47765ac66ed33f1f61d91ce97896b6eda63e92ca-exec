#!/bin/bash

make_title() {
	printf '\033[01;38;5;022m############### %s ###############\033[0m\n' "$1"
}

make_title "LIST"
./bin/cli.js lib/api.js

make_title "SUMMARY"
./bin/cli.js lib/api.js -s

make_title "DEPENDS"
./bin/cli.js lib/api.js -d log.js

make_title "CIRCULAR (OK)"
./bin/cli.js test/cjs/a.js -c

make_title "CIRCULAR (FOUND, NO INDEX COUNTING)"
./bin/cli.js test/cjs/circular/a.js -c --no-count

make_title "CIRCULAR (FOUND, WITH INDEX COUNT)"
./bin/cli.js test/cjs/circular/a.js -c

make_title "NPM"
./bin/cli.js test/cjs/npm.js --include-npm

make_title "STDIN"
./bin/cli.js --json lib/api.js | tr '[a-z]' '[A-Z]' | ./bin/cli.js --stdin

make_title "IMAGE"
./bin/cli.js lib/api.js --image /tmp/test.svg

make_title "DOT"
./bin/cli.js lib/api.js --dot

make_title "JSON"
./bin/cli.js lib/api.js --json

make_title "NO COLOR"
./bin/cli.js lib/api.js --no-color

make_title "SHOW EXTENSION"
./bin/cli.js lib/api.js --show-extension

make_title "WARNINGS (NOTE)"
./bin/cli.js test/cjs/missing.js -c

make_title "WARNINGS (LIST)"
./bin/cli.js test/cjs/missing.js -c --warning

make_title "ERROR"
./bin/cli.js file/not/found.js

make_title "DEBUG"
./bin/cli.js lib/log.js --debug

exit 0
